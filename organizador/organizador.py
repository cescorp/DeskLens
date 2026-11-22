"""Organizador de proyectos: módulo de DeskLens (plan en implementar_organizador.md, Fase 1a).

No mueve archivos. Une las partes de cada proyecto repartidas por los discos con:
  - un ancla: archivo oculto `.desklens-ancla` dentro de cada carpeta, con solo {"id", "creada"};
  - un registro de anclas (anclas.json): id → última ruta, número de serie del disco, ID de NTFS, última vez vista;
  - una ficha por proyecto (proyectos/<id>.json) que guarda ids de anclas, nunca rutas.

Todo vive en historial/organizador/ (fuera de git). Nada ocurre a escondidas: cada acción automática deja una línea en
actividad.log (qué, dónde, cuándo) y lo que está en marcha se ve en /api/org/actividad.

El servidor de DeskLens llama a get()/post(); devuelven (código HTTP, datos) o None si la ruta no es de este módulo.
"""
import ctypes
import fnmatch
import json
import os
import re
import shutil
import sqlite3
import subprocess
import threading
import time
import unicodedata
import uuid
from datetime import datetime, timedelta
from pathlib import Path

WINDOWS = os.name == "nt"
NO_WINDOW = 0x08000000 if WINDOWS else 0
ANCLA = ".desklens-ancla"
ID_RE = re.compile(r"[0-9a-f]{32}")

DATA = Path(__file__).resolve().parent.parent / "historial" / "organizador"  # configurar() lo cambia en las pruebas


def configurar(carpeta):
    """Carpeta de datos del módulo (las pruebas usan una temporal para no tocar los datos reales)."""
    global DATA
    DATA = Path(carpeta)
    DATA.mkdir(parents=True, exist_ok=True)


# ---------- JSON y ajustes ----------

def leer_json(p, base):
    """Lee un JSON del módulo; si no existe o está roto devuelve `base` (nunca rompe el arranque)."""
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return base


def escribir_json(p, datos):
    """Escritura atómica: se escribe al lado y se reemplaza, así un corte de luz no deja el archivo a medias."""
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, p)


TIPOS = ["codigo", "entornos", "material", "web", "respaldos", "base_datos", "documentos", "otro"]
NOMBRE_TIPO = {"codigo": "Código", "entornos": "Entornos", "material": "Material", "web": "Web", "respaldos": "Respaldos",
               "base_datos": "Base de datos", "documentos": "Documentos", "otro": "Otra"}
# 🚦 Entornos: etapas del despliegue en orden (pruebas → calidad → producción). Cada etapa es una carpeta anclada o una
# etapa remota (nombre + dirección, p. ej. el VPS), guardada como carpeta con ancla «remota:<id>» (sin archivo .desklens-ancla).
ETAPAS = [(("prueba", "test", "dev", "desarrollo", "local"), "Pruebas"), (("calidad", "qa", "staging", "preprod"), "Calidad"),
          (("produccion", "prod", "vps", "live", "deploy", "servidor"), "Producción")]
ORDEN_ETAPA = {"Pruebas": 0, "Calidad": 1, "Producción": 2}


def etapa_sugerida(nombre):
    n = normalizar(nombre)
    return next((e for palabras, e in ETAPAS if any(x in n for x in palabras)), "")
ESTADOS = ["activo", "pausado", "terminado", "archivo"]
INDICE = ["todo", "nombres_pdf", "nombres", "no"]

AJUSTES_BASE = {
    "encendido": True,
    "ignorar_git": True,        # .desklens-ancla en .git/info/exclude (solo este PC)
    "avisar_web": True,         # avisar al anclar una carpeta servida por la web (htdocs…)
    "indice": {"codigo": "todo", "entornos": "todo", "web": "todo", "documentos": "todo", "material": "nombres_pdf",
               "respaldos": "no", "base_datos": "no", "otro": "nombres"},
    "historial_dias": 7,
    "historial_mb": 200,
    "respaldo_disco": "",       # número de serie del disco donde va la copia diaria de historial/organizador
    "respaldo_guardar": 14,
    "mapa": True,               # mantener MAPA.md para la IA
}


def ajustes():
    """Ajustes del organizador (⚙ Ajustes › Proyectos) completados con los valores por defecto."""
    a = leer_json(DATA / "ajustes.json", {})
    out = json.loads(json.dumps(AJUSTES_BASE))
    for k, v in a.items():
        if k == "indice" and isinstance(v, dict):
            out["indice"].update({t: m for t, m in v.items() if t in TIPOS and m in INDICE})
        elif k in out and type(v) is type(out[k]):
            out[k] = v
    return out


def guardar_ajustes(cambios):
    """Cambia solo las claves conocidas y con el tipo correcto; devuelve los ajustes completos."""
    a = ajustes()
    for k, v in (cambios or {}).items():
        if k == "indice" and isinstance(v, dict):
            a["indice"].update({t: m for t, m in v.items() if t in TIPOS and m in INDICE})
        elif k in a and type(v) is type(a[k]):
            a[k] = v
    limites = {"historial_dias": (1, 365), "historial_mb": (0, 100000), "respaldo_guardar": (1, 365)}
    for k, (lo, hi) in limites.items():
        a[k] = max(lo, min(hi, a[k]))
    if a["respaldo_disco"] and not re.fullmatch(r"[0-9A-F]{1,16}", a["respaldo_disco"]):
        raise ValueError("Disco de respaldo no válido")
    escribir_json(DATA / "ajustes.json", a)
    actividad("ajustes", "Ajustes del organizador guardados", str(DATA / "ajustes.json"))
    mapa_luego()
    return a


# ---------- actividad: qué pasó, dónde y cuándo ----------

_act_lock = threading.Lock()
en_curso = {}  # id → {"texto", "ruta", "desde"}: lo que está pasando ahora (lo pinta 📋 Actividad)


def actividad(tipo, texto, ruta="", estado="ok"):
    """Una línea en actividad.log. estado: ok · aviso · error."""
    linea = {"t": datetime.now().isoformat(timespec="seconds"), "tipo": tipo, "texto": texto, "ruta": ruta, "estado": estado}
    with _act_lock:
        DATA.mkdir(parents=True, exist_ok=True)
        with open(DATA / "actividad.log", "a", encoding="utf-8") as f:
            f.write(json.dumps(linea, ensure_ascii=False) + "\n")


def leer_actividad(limite=200):
    """Últimas líneas (las más nuevas primero) y lo que está en curso. Las de más de 30 días se descartan al leer."""
    corte = (datetime.now() - timedelta(days=30)).isoformat()
    try:
        lineas = (DATA / "actividad.log").read_text(encoding="utf-8").splitlines()
    except OSError:
        lineas = []
    out = []
    for ln in reversed(lineas):
        try:
            d = json.loads(ln)
        except ValueError:
            continue
        if d.get("t", "") < corte:
            break
        out.append(d)
        if len(out) >= limite:
            break
    return {"en_curso": list(en_curso.values()), "lineas": out}


# ---------- nombres ----------

def normalizar(nombre):
    """Clave para relacionar por nombre: sin mayúsculas, tildes ni separadores (HomeShape = home_shape = homeshape)."""
    s = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def slug(nombre):
    """Id legible para la ficha: «Curso bíblico» → curso-biblico."""
    s = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "proyecto"


# Iconos y tipos sugeridos por palabras del nombre (aprobado 2026-11-21; el usuario los cambia en la ficha)
ICONOS = [(("video", "clases", "grab"), "🎬"), (("audio", "musica", "podcast"), "🎵"),
          (("img", "imagen", "foto", "diseno"), "🖼"), (("doc", "pdf", "libro", "biblia"), "📚"),
          (("web", "public", "htdocs", "www"), "🌐"), (("src", "app", "codigo"), "💻"),
          (("backup", "respaldo", "copia"), "🗄"), (("db", "sql", "base"), "🛢"), (("notas", "apuntes"), "📝")]
TIPO_PALABRAS = [(("pruebas", "calidad", "qa", "staging", "produccion", "vps", "preprod"), "entornos"),  # antes que respaldos
                 (("backup", "respaldo", "copia", "bak", "old", "antiguo"), "respaldos"),
                 (("video", "material", "curriculo", "clase", "audio", "img", "imagen", "foto", "diseno", "grab"), "material"),
                 (("doc", "documento", "manual", "pdf", "libro"), "documentos"),
                 (("dump", "sql", "basedatos", "db"), "base_datos")]
CARPETAS_WEB = {"htdocs", "www", "public_html", "wwwroot"}
# Carpetas que agrupan proyectos: cada hija es un proyecto (p. ej. Webs/rsbiblica), aunque no tenga git ni archivos de
# proyecto; así lo que hay dentro (librerías con composer.json, copias) no se propone como otro proyecto.
CONTENEDORES = CARPETAS_WEB | {"webs", "proyectos", "projects", "repos", "repositorios", "source", "sources", "desarrollo",
                               "dev", "github", "sites", "sitios", "codigo", "code"}


def icono_sugerido(nombre, git=False):
    """Icono de carpeta sugerido por su nombre (📁 si nada coincide)."""
    if git:
        return "💻"
    n = normalizar(nombre)
    for palabras, icono in ICONOS:
        if any(p in n for p in palabras):
            return icono
    return "📁"


def tipo_sugerido(ruta, codigo=False):
    """Tipo de parte sugerido: web si cuelga de htdocs/www; código si tiene git o archivos de proyecto; si no, por nombre."""
    partes = [normalizar(x) for x in Path(ruta).parts]
    if any(p in CARPETAS_WEB for p in partes[:-1]):
        return "web"
    n = partes[-1] if partes else ""
    for palabras, tipo in TIPO_PALABRAS:
        if any(p in n for p in palabras):
            return tipo
    return "codigo" if codigo else "otro"


# ---------- Windows: disco, serie, ID de NTFS, oculto ----------

def serie(p):
    """Número de serie del volumen (os.stat lo da en st_dev en Windows): reconoce el disco aunque cambie de letra."""
    try:
        return format(os.stat(p).st_dev, "08X")
    except OSError:
        return ""


def ocultar(p):
    """Marca el ancla como oculta (no estorba en el Explorador). Si falla no pasa nada."""
    if WINDOWS:
        try:
            ctypes.windll.kernel32.SetFileAttributesW(str(p), 0x2)
        except (OSError, AttributeError):
            pass


def _volumen_info(raiz):
    """(etiqueta, tipo) del disco: tipo 2 = extraíble, 3 = fijo, 4 = red."""
    if not WINDOWS:
        return "", 3
    k = ctypes.windll.kernel32
    buf = ctypes.create_unicode_buffer(261)
    ok = k.GetVolumeInformationW(ctypes.c_wchar_p(raiz), buf, 261, None, None, None, None, 0)
    return (buf.value if ok else ""), k.GetDriveTypeW(ctypes.c_wchar_p(raiz))


def ruta_por_id_ntfs(raiz, ino):
    """Ruta actual de una carpeta por su ID de NTFS dentro de un disco (sirve si se movió dentro del mismo disco).
    OpenFileById + GetFinalPathNameByHandleW. Devuelve None si no existe o no se puede abrir."""
    if not WINDOWS or not ino:
        return None
    from ctypes import wintypes
    k = ctypes.windll.kernel32
    k.CreateFileW.restype = wintypes.HANDLE
    k.OpenFileById.restype = wintypes.HANDLE
    k.CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD,
                              wintypes.DWORD, wintypes.HANDLE]

    class _U(ctypes.Union):
        _fields_ = [("FileId", ctypes.c_ulonglong), ("Ext", ctypes.c_ubyte * 16)]

    class FID(ctypes.Structure):
        _fields_ = [("dwSize", wintypes.DWORD), ("Type", ctypes.c_int), ("u", _U)]

    malo = wintypes.HANDLE(-1).value
    backup, share = 0x02000000, 0x7
    vol = k.CreateFileW(raiz, 0, share, None, 3, backup, None)
    if not vol or vol == malo:
        return None
    try:
        fid = FID()
        fid.dwSize = ctypes.sizeof(FID)
        if ino < 2 ** 64:
            fid.Type, fid.u.FileId = 0, ino
        else:  # ID de 128 bits (ReFS)
            fid.Type = 2
            for i, b in enumerate(ino.to_bytes(16, "little")):
                fid.u.Ext[i] = b
        h = k.OpenFileById(wintypes.HANDLE(vol), ctypes.byref(fid), 0x80, share, None, backup)
        if not h or h == malo:
            return None
        try:
            buf = ctypes.create_unicode_buffer(32768)
            n = k.GetFinalPathNameByHandleW(wintypes.HANDLE(h), buf, 32768, 0)
            if not n:
                return None
            r = buf.value
            return corta(r)
        finally:
            k.CloseHandle(wintypes.HANDLE(h))
    finally:
        k.CloseHandle(wintypes.HANDLE(vol))


# ---------- anclas ----------

_anclas_lock = threading.RLock()


LARGA = "\\\\?\\"  # prefijo de ruta larga de Windows: \\?\


def larga(p):
    r"""Ruta para tocar de verdad la carpeta. En Windows lleva \\?\ delante: sin él, una carpeta cuyo nombre termina en
    espacio o punto («plan de la biblia corto ») se «normaliza» quitándolo y parece que no existe."""
    s = str(p)
    if not WINDOWS or s.startswith(LARGA) or not re.match(r"[A-Za-z]:\\", s):
        return Path(s)
    return Path(LARGA + s)


def corta(p):
    r"""La ruta tal como se muestra y se guarda (sin \\?\)."""
    s = str(p)
    return s[len(LARGA):] if s.startswith(LARGA) else s


def leer_ancla(carpeta):
    """Id del ancla de una carpeta, o None. Solo acepta un archivo pequeño con un id válido (32 hex)."""
    p = larga(carpeta) / ANCLA
    try:
        if not p.is_file() or p.stat().st_size > 512:
            return None
        i = json.loads(p.read_text(encoding="utf-8")).get("id", "")
    except (OSError, ValueError, AttributeError):
        return None
    return i if ID_RE.fullmatch(i or "") else None


def registro():
    return leer_json(DATA / "anclas.json", {})


def _registrar(i, carpeta, reg=None):
    """Apunta en anclas.json dónde está el ancla ahora (ruta, disco, ID de NTFS, cuándo se vio)."""
    with _anclas_lock:
        reg = registro() if reg is None else reg
        c = Path(corta(carpeta))
        try:
            ino = os.stat(larga(c)).st_ino
        except OSError:
            ino = 0
        d = reg.get(i, {})
        if d.get("ruta") and d["ruta"] != str(c):
            mapa_luego()  # el ancla está en otro sitio: el mapa dice la ruta nueva
        d.update({"ruta": str(c), "serie": serie(larga(c)), "ino": ino, "visto": datetime.now().isoformat(timespec="seconds")})
        d.setdefault("creada", d["visto"])
        for k in ("papelera", "eliminada", "borrada"):  # está en una carpeta de verdad: ya no en la papelera
            d.pop(k, None)
        reg[i] = d
        escribir_json(DATA / "anclas.json", reg)
        return d


def repo_git(carpeta):
    """Carpeta raíz del repositorio git que contiene `carpeta`, o None."""
    c = Path(os.path.abspath(corta(carpeta)))
    for p in [c, *c.parents]:
        if (p / ".git").exists():
            return p
    return None


def excluir_en_git(carpeta):
    """Añade el ancla a .git/info/exclude del repo (solo este PC; no toca .gitignore). Devuelve la ruta del exclude o ''."""
    repo = repo_git(carpeta)
    if not repo:
        return ""
    excl = None
    if shutil.which("git"):  # también resuelve worktrees y submódulos (.git como archivo)
        try:
            r = subprocess.run(["git", "rev-parse", "--git-path", "info/exclude"], cwd=str(repo), capture_output=True,
                               text=True, timeout=10, creationflags=NO_WINDOW)
            if r.returncode == 0 and r.stdout.strip():
                excl = Path(r.stdout.strip())
                excl = excl if excl.is_absolute() else repo / excl
        except (OSError, subprocess.SubprocessError):
            pass
    if excl is None:
        if not (repo / ".git").is_dir():
            return ""
        excl = repo / ".git" / "info" / "exclude"
    try:
        txt = excl.read_text(encoding="utf-8") if excl.exists() else ""
        if any(ln.strip() == ANCLA for ln in txt.splitlines()):
            return str(excl)
        excl.parent.mkdir(parents=True, exist_ok=True)
        with open(excl, "a", encoding="utf-8") as f:
            f.write(("" if txt.endswith("\n") or not txt else "\n") + "# DeskLens: ancla del organizador (solo en este PC)\n" + ANCLA + "\n")
    except OSError:
        return ""
    actividad("git", f"{ANCLA} añadida a .git/info/exclude", str(excl))
    return str(excl)


def es_web(carpeta):
    """True si la carpeta cuelga de htdocs, www… (el ancla se podría ver desde el navegador)."""
    return any(normalizar(x) in CARPETAS_WEB for x in Path(carpeta).parts)


def poner_ancla(carpeta):
    """Ancla de una carpeta: la que ya tiene o una nueva. Devuelve (id, avisos).
    Un archivo suelto se ancla por la carpeta que lo contiene."""
    c = Path(corta(carpeta))  # sin resolve(): quitaría el espacio o punto final de un nombre
    if not c.is_absolute():
        c = Path(os.path.abspath(c))
    if larga(c).is_file():
        c = c.parent
    if not larga(c).is_dir():
        raise ValueError(f"No existe la carpeta: {c}")
    if c == Path(c.anchor):
        raise ValueError("No se ancla un disco entero: elige una carpeta dentro de él")
    avisos = []
    i = leer_ancla(c)
    if not i:
        if (larga(c) / ANCLA).exists():
            raise ValueError(f"{c / ANCLA} existe pero no es un ancla válida; revísalo a mano")
        i = uuid.uuid4().hex
        (larga(c) / ANCLA).write_text(json.dumps({"id": i, "creada": datetime.now().isoformat(timespec="seconds")}), encoding="utf-8")
        ocultar(larga(c) / ANCLA)
        actividad("ancla", "Ancla creada", str(c / ANCLA))
    a = ajustes()
    if a["ignorar_git"]:
        excluir_en_git(c)
    if a["avisar_web"] and es_web(c):
        avisos.append(f"{c} se sirve por la web: {ANCLA} se puede ver desde el navegador (solo contiene un id)")
    _registrar(i, c)
    return i, avisos


def en_papelera(ruta):
    """True si la ruta está dentro de la papelera de Windows ($Recycle.Bin)."""
    return any(x.lower() == "$recycle.bin" for x in Path(ruta).parts)


def _marcar(i, cambios=None, quitar=()):
    """Cambia campos del registro de un ancla sin tocar su ruta (papelera, eliminada…)."""
    with _anclas_lock:
        reg = registro()
        if i in reg:
            reg[i].update(cambios or {})
            for k in quitar:
                reg[i].pop(k, None)
            escribir_json(DATA / "anclas.json", reg)


def ubicar(i, reg=None, buscar_ntfs=True):
    """Dónde está ahora un ancla: (estado, ruta). estado: ok · movida · papelera · eliminada · desconectado · falta.
    1) última ruta conocida → 2) ID de NTFS en su disco (si está conectado). El recorrido de discos es aparte.
    Una carpeta enviada a la papelera NO está «movida»: se avisa y se guarda la ruta de antes, nunca la de la papelera.
    Si se restaura vuelve sola a «ok»; si se vacía la papelera pasa a «eliminada»."""
    reg = registro() if reg is None else reg
    d = reg.get(i)
    if not d:
        return "falta", ""
    if en_papelera(d["ruta"]):  # registro de antes de esta corrección: la ruta apuntaba dentro de la papelera
        _marcar(i, {"papelera": d["ruta"], "ruta": d.get("antes") or d["ruta"], "eliminada": d.get("visto", "")})
        d = registro()[i]
    if leer_ancla(d["ruta"]) == i:
        if d.get("papelera") or d.get("borrada"):  # restaurada desde la papelera
            _marcar(i, quitar=("papelera", "eliminada", "borrada"))
            actividad("ancla", "Carpeta restaurada de la papelera: vuelve a estar en su sitio", d["ruta"])
        return "ok", d["ruta"]
    letra = letra_de_serie(d.get("serie", ""))
    if not letra:
        return "desconectado", d["ruta"]
    if buscar_ntfs:
        r = ruta_por_id_ntfs(letra, d.get("ino", 0))
        if r and leer_ancla(r) == i:
            if en_papelera(r):
                if not d.get("papelera"):  # se avisa una sola vez
                    _marcar(i, {"papelera": r, "eliminada": datetime.now().isoformat(timespec="seconds")})
                    actividad("ancla", f"{d['ruta']} se envió a la papelera", d["ruta"], "aviso")
                return "papelera", d["ruta"]
            _registrar(i, r)
            actividad("ancla", f"Ancla encontrada por ID de NTFS (antes en {d['ruta']})", r)
            return "movida", r
    if d.get("papelera"):  # estaba en la papelera y ya no: se vació (o se borró de ella)
        if not d.get("borrada"):
            _marcar(i, {"borrada": datetime.now().isoformat(timespec="seconds")})
            actividad("ancla", f"{d['ruta']} se eliminó definitivamente (papelera vaciada)", d["ruta"], "aviso")
        return "eliminada", d["ruta"]
    return "falta", d["ruta"]


# ---------- discos ----------

SALTAR_NOMBRES = {".git", "node_modules", "__pycache__", "vendor", "$recycle.bin", "system volume information"}
EXCLUIDAS_SISTEMA = ["Windows", "Program Files", "Program Files (x86)", "ProgramData", "Users\\*\\AppData",
                     "Users\\*\\.*", "Recovery", "PerfLogs", "$WinREAgent", "$Recycle.Bin", "System Volume Information"]
EXCLUIDAS_TODOS = ["$Recycle.Bin", "System Volume Information"]


def _letras():
    if not WINDOWS:
        return ["/"]
    return [f"{l}:\\" for l in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" if os.path.exists(f"{l}:\\")]


def letra_de_serie(s):
    """Letra actual del disco con ese número de serie ('' si no está conectado)."""
    if not s:
        return ""
    for r in _letras():
        if serie(r) == s:
            return r
    return ""


def config_discos():
    return leer_json(DATA / "discos.json", {})


def excluidas_de(s, raiz, cfg=None):
    """Exclusiones de un disco: predeterminadas (menos las quitadas a mano) + las propias. Rutas relativas a la raíz."""
    d = (cfg if cfg is not None else config_discos()).get(s, {})
    sistema = (os.environ.get("SystemDrive", "C:") + "\\").upper() == str(raiz).upper()
    base = EXCLUIDAS_SISTEMA if sistema else EXCLUIDAS_TODOS
    quitadas = {q.lower() for q in d.get("quitadas", [])}
    pred = [e for e in base if e.lower() not in quitadas]
    return pred, list(d.get("propias", []))


def discos():
    """Todos los discos conectados y los recordados que no lo están, con su configuración (☑ para anclas, exclusiones)."""
    cfg = config_discos()
    out, vistos = [], set()
    for r in _letras():
        s = serie(r)
        if not s or s in vistos:
            continue
        vistos.add(s)
        etiqueta, tipo = _volumen_info(r)
        try:
            u = shutil.disk_usage(r)
            total, libre = u.total, u.free
        except OSError:
            total = libre = 0
        d = cfg.get(s, {})
        pred, propias = excluidas_de(s, r, cfg)
        out.append({"serie": s, "letra": r, "nombre": etiqueta or d.get("nombre", ""), "tipo": tipo, "total": total,
                    "libre": libre, "conectado": True, "activo": bool(d.get("activo")), "predeterminadas": pred, "quitadas": d.get("quitadas", []),
                    "propias": propias, "ultimo_s": d.get("ultimo_s"), "carpetas": d.get("carpetas"),
                    "visto": d.get("visto", "")})
    for s, d in cfg.items():
        if s not in vistos:
            out.append({"serie": s, "letra": d.get("letra", ""), "nombre": d.get("nombre", ""), "conectado": False,
                        "activo": bool(d.get("activo")), "predeterminadas": [], "propias": d.get("propias", []),
                        "ultimo_s": d.get("ultimo_s"), "carpetas": d.get("carpetas"), "visto": d.get("visto", "")})
    return out


def guardar_disco(s, cambios):
    """☑/☐ para anclas, exclusiones propias y predeterminadas quitadas (o «restaurar»). Al cambiar exclusiones se borra
    el tiempo medido (se vuelve a medir en el siguiente recorrido)."""
    if not re.fullmatch(r"[0-9A-F]{1,16}", s or ""):
        raise ValueError("Disco no válido")
    cfg = config_discos()
    d = cfg.setdefault(s, {})
    letra = letra_de_serie(s)
    if letra:
        d["letra"] = letra
        d["nombre"] = _volumen_info(letra)[0] or d.get("nombre", "")
    if "activo" in cambios:
        d["activo"] = bool(cambios["activo"])
        actividad("discos", f"Disco {letra or s} {'añadido a' if d['activo'] else 'quitado de'} la búsqueda de anclas", letra)
    tocadas = False
    if isinstance(cambios.get("propias"), list):
        d["propias"] = sorted({str(x).strip().strip("\\/") for x in cambios["propias"] if str(x).strip().strip("\\/")})
        tocadas = True
    if isinstance(cambios.get("quitadas"), list):
        d["quitadas"] = sorted({str(x) for x in cambios["quitadas"]})
        tocadas = True
    if cambios.get("restaurar"):
        d["quitadas"] = []
        tocadas = True
    if tocadas:
        d.pop("ultimo_s", None)
        actividad("discos", f"Exclusiones de {letra or s} cambiadas", letra)
    escribir_json(DATA / "discos.json", cfg)
    return [x for x in discos() if x["serie"] == s][0] if letra else d


def relativa(ruta, raiz):
    """Ruta escrita por el usuario (absoluta o relativa) → relativa a la raíz del disco, o ValueError."""
    p = Path(ruta)
    if p.is_absolute():
        try:
            return str(p.resolve().relative_to(Path(raiz)))
        except ValueError:
            raise ValueError(f"{ruta} no está en {raiz}")
    return str(p).strip("\\/")


class Exclusiones:
    """¿Se salta esta carpeta? Patrones relativos a la raíz con * por tramo (Users\\*\\AppData), sin mayúsculas."""

    def __init__(self, patrones):
        self.por_largo = {}
        for p in patrones:
            tramos = [t.lower() for t in re.split(r"[\\/]+", p.strip("\\/")) if t]
            if tramos:
                self.por_largo.setdefault(len(tramos), []).append(tramos)

    def salta(self, tramos):
        for pat in self.por_largo.get(len(tramos), ()):
            if all(fnmatch.fnmatchcase(t, q) for t, q in zip(tramos, pat)):
                return True
        return False


# ---------- recorrido de discos (solo nombres de carpetas; no se lee ni indexa nada) ----------

MARCAS = {".git", "artisan", "composer.json", "package.json", "requirements.txt", "pyproject.toml", "setup.py"}


def db():
    c = sqlite3.connect(DATA / "carpetas.db", timeout=30)
    c.execute("CREATE TABLE IF NOT EXISTS carpetas (ruta TEXT PRIMARY KEY, serie TEXT, nombre TEXT, clave TEXT, marca TEXT)")
    c.execute("CREATE INDEX IF NOT EXISTS carpetas_serie ON carpetas(serie)")
    return c


class Recorrido:
    """Recorre discos en segundo plano. modo «anclas»: busca ids concretos y para en cuanto aparecen todos.
    modo «arranque»: guarda los nombres de todas las carpetas (carpetas.db) y apunta cada ancla que encuentra.
    Se ve en vivo (estado()) y se puede detener."""

    def __init__(self, series, modo="anclas", buscar=()):
        self.modo, self.buscar = modo, set(buscar)
        self.encontradas = {}
        self.copias = {}  # id → carpetas con la misma ancla (una copia): se pregunta cuál es la buena
        self.parar = threading.Event()
        self.inicio = time.time()
        cfg = config_discos()
        self.discos = []
        for s in series:
            letra = letra_de_serie(s)
            d = cfg.get(s, {})
            self.discos.append({"serie": s, "letra": letra or d.get("letra", ""), "estado": "espera" if letra else "desconectado",
                                "carpetas": 0, "segundos": 0.0, "antes": d.get("carpetas") or 0, "estimado": d.get("ultimo_s")})
        self.hilo = threading.Thread(target=self._correr, daemon=True)

    def estado(self):
        return {"modo": self.modo, "discos": self.discos, "faltan": sorted(self.buscar - set(self.encontradas)),
                "encontradas": self.encontradas, "copias": self.copias, "segundos": round(time.time() - self.inicio, 1),
                "activo": self.hilo.is_alive(), "detenido": self.parar.is_set()}

    def _correr(self):
        clave = f"recorrido-{id(self)}"
        en_curso[clave] = {"texto": "Recorriendo discos" + (" (buscando anclas)" if self.modo == "anclas" else ""),
                           "ruta": "", "desde": datetime.now().isoformat(timespec="seconds")}
        try:
            for d in self.discos:
                if self.parar.is_set() or (self.modo == "anclas" and self.buscar and self.buscar <= set(self.encontradas)):
                    if d["estado"] == "espera":
                        d["estado"] = "omitido"
                    continue
                if d["estado"] == "desconectado":
                    continue
                en_curso[clave]["ruta"] = d["letra"]
                self._disco(d)
        finally:
            en_curso.pop(clave, None)
            n = len(self.encontradas)
            actividad("recorrido", f"Recorrido terminado ({self.modo}): {n} ancla(s) encontrada(s)"
                      + (" · detenido" if self.parar.is_set() else ""), "", "aviso" if self.parar.is_set() else "ok")

    def _disco(self, d):
        raiz, s = d["letra"], d["serie"]
        d["estado"] = "recorriendo"
        pred, propias = excluidas_de(s, raiz)
        excl = Exclusiones(pred + propias)
        t0 = time.time()
        filas = []
        con = db() if self.modo == "arranque" else None
        if con:
            con.execute("DELETE FROM carpetas WHERE serie = ?", (s,))
        reg = registro()
        pila = [(raiz, [])]
        completo = True
        while pila:
            if self.parar.is_set():
                completo = False
                break
            ruta, tramos = pila.pop()
            try:
                it = os.scandir(ruta)
            except OSError:
                continue
            marca = ""
            hijos = []
            with it:
                for e in it:
                    n = e.name
                    if n == ANCLA:
                        try:
                            es_archivo = e.is_file(follow_symlinks=False)
                        except OSError:
                            es_archivo = False
                        if es_archivo:
                            self._ancla(ruta, reg)
                        continue
                    if n == ".git":
                        marca = "git"
                    elif n in MARCAS and not marca:
                        marca = "codigo"
                    try:
                        if not e.is_dir(follow_symlinks=False) or e.is_junction():
                            continue
                    except OSError:
                        continue
                    if n.lower() in SALTAR_NOMBRES:
                        continue
                    t = tramos + [n.lower()]
                    if excl.salta(t):
                        continue
                    hijos.append((e.path, t, n))
            if con and tramos:
                padre = normalizar(tramos[-2]) if len(tramos) >= 2 else ""
                filas.append((ruta, s, Path(ruta).name, normalizar(Path(ruta).name), marca
                              or ("web" if padre in CARPETAS_WEB else "contenedor" if padre in CONTENEDORES else "")))
                if len(filas) >= 5000:
                    con.executemany("INSERT OR REPLACE INTO carpetas VALUES (?,?,?,?,?)", filas)
                    filas = []
            for h in hijos:
                pila.append((h[0], h[1]))
            d["carpetas"] += 1
            d["segundos"] = round(time.time() - t0, 1)
            if self.modo == "anclas" and self.buscar and self.buscar <= set(self.encontradas):
                completo = False  # ya están todas: no hace falta seguir
                break
        if con:
            con.executemany("INSERT OR REPLACE INTO carpetas VALUES (?,?,?,?,?)", filas)
            con.commit()
            con.close()
        d["segundos"] = round(time.time() - t0, 1)
        d["estado"] = "listo" if completo else ("detenido" if self.parar.is_set() else "listo")
        if completo:  # tiempo y carpetas medidos: estiman la próxima vez
            cfg = config_discos()
            x = cfg.setdefault(s, {})
            x.update({"ultimo_s": d["segundos"], "carpetas": d["carpetas"], "letra": raiz,
                      "visto": datetime.now().isoformat(timespec="seconds")})
            escribir_json(DATA / "discos.json", cfg)

    def _ancla(self, carpeta, reg):
        i = leer_ancla(carpeta)
        if not i:
            return
        if i in self.encontradas and self.encontradas[i] != carpeta:
            self.copias.setdefault(i, [self.encontradas[i]]).append(carpeta)
            return
        if self.modo == "anclas" and i not in self.buscar:
            return
        if self.modo == "arranque" and i not in reg:
            return  # anclas de otro DeskLens (o borradas de una ficha): no se adoptan solas
        antes = reg.get(i, {}).get("ruta")
        self.encontradas[i] = carpeta
        if antes != carpeta:
            _registrar(i, carpeta)
            actividad("ancla", f"Ancla encontrada (antes en {antes})", carpeta)


recorrido = None


def iniciar_recorrido(series, modo="anclas", buscar=()):
    """Un solo recorrido a la vez; si ya hay uno en marcha se devuelve ese."""
    global recorrido
    if recorrido and recorrido.hilo.is_alive():
        return recorrido.estado()
    if modo == "anclas":
        if not buscar:
            buscar = [x["id"] for x in alertas() if x["estado"] == "falta" and not x["id"].startswith("archivo:")]  # en la papelera o sin disco: no se busca
        orden = {}
        reg = registro()
        for i in buscar:  # primero el disco donde estaba cada ancla
            orden.setdefault(reg.get(i, {}).get("serie", ""), 0)
        cfg = config_discos()
        series = sorted(series, key=lambda s: (s not in orden, cfg.get(s, {}).get("ultimo_s") or 1e9))
    recorrido = Recorrido(series, modo, buscar)
    actividad("recorrido", f"Recorrido iniciado ({modo}) en {len(series)} disco(s)")
    recorrido.hilo.start()
    return recorrido.estado()


def estado_recorrido():
    return recorrido.estado() if recorrido else None


def detener_recorrido():
    if recorrido:
        recorrido.parar.set()
    return estado_recorrido()


# ---------- relaciones por nombre (flujo de arranque) ----------

GENERICAS = {"test", "tests", "temp", "data", "datos", "docs", "src", "app", "apps", "source", "proyecto", "proyectos",
             "project", "projects", "nuevo", "nueva", "backup", "copia", "public", "build", "dist", "main", "master",
             "demo", "prueba", "pruebas", "web", "site", "sitio", "repo", "repos", "code", "codigo", "github",
             # carpetas de librerías y de estructura que se repiten dentro de los proyectos
             "classes", "class", "lib", "libs", "library", "includes", "include", "files", "mails", "assets", "plugins",
             "modules", "packages", "components", "images", "imagenes", "fonts", "scripts", "utils", "core", "admin",
             "config", "views", "templates", "resources", "storage", "database", "tools", "examples", "ejemplos",
             "backend", "frontend", "server", "client", "cliente", "servidor", "api",
             "notes", "notas", "install", "installer", "instalar", "misc", "miscellaneous", "vscode", "idea", "setup"}


def _dentro(ruta, raices):
    r = ruta.lower().rstrip("\\/") + os.sep
    return any(r.startswith(x.lower().rstrip("\\/") + os.sep) and r != x.lower().rstrip("\\/") + os.sep for x in raices)


def relaciones(extra=(), limite=200):
    """Propone proyectos y sus partes relacionando nombres de carpetas guardados por el recorrido de arranque.
    Semillas: carpetas con git o archivos de proyecto, las de htdocs/www y `extra` (proyectos actuales de DeskLens).
    Cada semilla busca carpetas cuyo nombre normalizado contenga el suyo (≥ 4 letras, no genérico).
    Una semilla cuyo nombre contiene el de otra (homeshape_calidad ⊃ homeshape) pasa a ser parte de la otra."""
    con = db()
    filas = con.execute("SELECT ruta, nombre, clave, marca FROM carpetas WHERE marca != ''").fetchall()
    semillas = {r[0]: r for r in filas}
    for e in extra:
        p = Path(e)
        semillas.setdefault(str(p), (str(p), p.name, normalizar(p.name), "codigo"))
    lista = sorted(semillas.values(), key=lambda r: len(r[0]))
    raices = []
    for r in lista:  # subproyectos (monorepos) fuera: cuentan como parte de la semilla de arriba
        if not _dentro(r[0], raices):
            raices.append(r[0])
    lista = [r for r in lista if r[0] in raices and len(r[2]) >= 4 and r[2] not in GENERICAS]
    grupos = {}
    for r in sorted(lista, key=lambda r: len(r[2])):
        corta = next((k for k in grupos if k in r[2]), None)
        if corta and corta != r[2]:
            grupos[corta]["absorbidas"].append(r)
        else:
            grupos.setdefault(r[2], {"semillas": [], "absorbidas": []})["semillas"].append(r)
    reg = registro()
    ancladas = {v["ruta"].lower() for v in reg.values()}
    raiz_de = {r.lower() for r in raices}

    def en_otro(ruta, propias):
        """True si cuelga de la raíz de otro proyecto (G:\\Webs\\rsbiblica\\_files\\_biblia no es parte de «Biblia»).
        Se miran solo las carpetas de arriba de la ruta: rápido aunque haya miles de semillas."""
        return any(str(p).lower() in raiz_de and str(p).lower() not in propias for p in Path(ruta).parents)
    out = []
    for clave, g in grupos.items():
        semis = [s[0] for s in g["semillas"]]
        esc = clave.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        hall = con.execute("SELECT ruta, nombre, marca FROM carpetas WHERE clave LIKE ? ESCAPE '\\' ORDER BY length(ruta)",
                           (f"%{esc}%",)).fetchall()
        tomadas, carpetas = list(semis), []
        for s in g["semillas"]:
            carpetas.append({"ruta": s[0], "nombre": s[1], "tipo": tipo_sugerido(s[0], s[3] in ("git", "codigo")), "semilla": True,
                             "etapa": etapa_sugerida(s[1])})
        propias = {x.lower() for x in semis}
        for ruta, nombre, marca in hall:
            if ruta in semis or _dentro(ruta, tomadas) or en_otro(ruta, propias):
                continue
            tomadas.append(ruta)
            carpetas.append({"ruta": ruta, "nombre": nombre, "tipo": tipo_sugerido(ruta, bool(marca)), "semilla": False,
                             "etapa": etapa_sugerida(nombre)})
        nombre = min(g["semillas"], key=lambda s: (s[3] not in ("git", "codigo"), len(s[0])))[1]
        for c in carpetas:
            c["icono"] = icono_sugerido(c["nombre"], c["tipo"] == "codigo")
            c["anclada"] = c["ruta"].lower() in ancladas
        git = any(s[3] == "git" for s in g["semillas"]) or any(s[0] in extra for s in g["semillas"])
        out.append({"clave": clave, "nombre": nombre, "coincidencias": len(carpetas), "carpetas": carpetas[:limite],
                    "recortadas": max(0, len(carpetas) - limite), "git": git})
    con.close()
    out.sort(key=lambda p: (-p["coincidencias"], p["nombre"].lower()))
    return out


# ---------- fichas ----------

_fichas_lock = threading.RLock()


def _ficha_path(i):
    if not re.fullmatch(r"[a-z0-9-]{1,80}", i or ""):
        raise ValueError("Id de proyecto no válido")
    return DATA / "proyectos" / f"{i}.json"


def fichas_crudas():
    out = []
    for p in sorted((DATA / "proyectos").glob("*.json")):
        f = leer_json(p, None)
        if isinstance(f, dict) and f.get("id") == p.stem:
            out.append(f)
    return out


def principal_de(f, ruta_de):
    """La carpeta principal del proyecto (su raíz en el dibujo): la elegida a mano (★ Hacer principal) si sigue en la
    ficha; si no, la que usa git (primero la de Código), luego la primera de Código y si no, la primera carpeta.
    Las etapas remotas no pueden serlo. ruta_de(ancla) → ruta actual o ''."""
    cs = [(p.get("tipo"), c["ancla"]) for p in f.get("partes", []) for c in p.get("carpetas", []) if not str(c["ancla"]).startswith(("remota:", "archivo:"))]
    if f.get("principal") in {a for _, a in cs}:
        return f["principal"]

    def git(a):
        r = ruta_de(a)
        return bool(r) and os.path.isdir(os.path.join(larga(r), ".git"))
    for vale in (lambda t, a: t == "codigo" and git(a), lambda t, a: git(a), lambda t, a: t == "codigo"):
        for t, a in cs:
            if vale(t, a):
                return a
    return cs[0][1] if cs else ""


def nombre_principal(f):
    """Nombre de la carpeta principal tal como está hoy en el disco ('' si no hay)."""
    reg = registro()
    r = reg.get(principal_de(f, lambda a: reg.get(a, {}).get("ruta", "")), {}).get("ruta", "")
    return Path(r).name if r else ""


def _limpiar(datos, previa=None):
    """Valida y completa una ficha (los campos calculados no se guardan)."""
    f = dict(previa or {})
    hoy = datetime.now().date().isoformat()
    if "nombre" in datos and previa and "nombre_sigue" not in datos and \
            str(datos["nombre"]).strip() not in (previa.get("nombre"), nombre_principal(previa)):
        f["nombre_sigue"] = False  # le pusiste nombre a mano: ya no sigue al de la carpeta principal
    if "nombre_sigue" in datos:
        f["nombre_sigue"] = bool(datos["nombre_sigue"])
    if "raiz_nombre" in datos:  # «Contenedor con nombre»: la raíz es el nombre del proyecto, no la carpeta ★
        f["raiz_nombre"] = bool(datos["raiz_nombre"])
        if f["raiz_nombre"] and "nombre_sigue" not in datos:
            f["nombre_sigue"] = False  # el nombre ya es la raíz: no cambia si renombras la carpeta ★
    if "principal" in datos:
        if previa and "nombre_sigue" not in datos and not f.get("raiz_nombre") and previa.get("nombre") == nombre_principal(previa):
            f["nombre_sigue"] = True  # se llamaba como la principal de antes: pasa a llamarse como la nueva
        f["principal"] = str(datos.get("principal") or "")[:40]
    f["nombre"] = str(datos.get("nombre", f.get("nombre", ""))).strip()[:120] or "Sin nombre"
    f["estado"] = datos.get("estado", f.get("estado", "activo"))
    if f["estado"] not in ESTADOS:
        raise ValueError(f"Estado no válido: {f['estado']}")
    try:
        f["avance"] = max(0, min(100, int(datos.get("avance", f.get("avance", 0)))))
    except (TypeError, ValueError):
        raise ValueError("El avance va de 0 a 100")
    for k, n in (("descripcion", 500), ("nota", 300), ("color", 20)):
        f[k] = str(datos.get(k, f.get(k, "")))[:n]
    f["tecnologia"] = [str(t)[:40] for t in datos.get("tecnologia", f.get("tecnologia", []))][:12]
    f["enlaces"] = [{"nombre": str(e.get("nombre", ""))[:60], "url": str(e.get("url", ""))[:500]}
                    for e in datos.get("enlaces", f.get("enlaces", [])) if isinstance(e, dict)][:20]
    f["fijado"] = bool(datos.get("fijado", f.get("fijado", False)))
    hist = datos.get("historial", f.get("historial")) or {}
    a = ajustes()
    f["historial"] = {"dias": int(hist.get("dias", a["historial_dias"])), "mb": int(hist.get("mb", a["historial_mb"]))}
    # vistas Flujo y Red: conectores tuyos, cajas libres y dónde dejaste cada nodo (por vista)
    cx = datos.get("conexiones", f.get("conexiones")) or []
    f["conexiones"] = [{"id": str(c.get("id", ""))[:40], "de": str(c.get("de", ""))[:80], "a": str(c.get("a", ""))[:80],
                        "etiqueta": str(c.get("etiqueta", ""))[:80], "color": str(c.get("color", ""))[:20],
                        "dir": c.get("dir") if c.get("dir") in ("→", "↔", "—") else "→"}
                       for c in cx if isinstance(c, dict) and c.get("de") and c.get("a")][:500]
    cj = datos.get("cajas", f.get("cajas")) or []
    f["cajas"] = [{"id": str(c.get("id", ""))[:40], "texto": str(c.get("texto", ""))[:300], "color": str(c.get("color", ""))[:20]}
                  for c in cj if isinstance(c, dict) and c.get("id")][:500]
    pos = datos.get("posiciones", f.get("posiciones")) or {}
    f["posiciones"] = {v: {str(k)[:80]: {"x": round(float(p.get("x", 0)), 1), "y": round(float(p.get("y", 0)), 1)}
                           for k, p in list((pos.get(v) or {}).items())[:2000] if isinstance(p, dict)}
                       for v in ("flujo", "red", "flujo:nombre", "red:nombre") if isinstance(pos, dict) and (":" not in v or v in pos)}  # :nombre = con «Contenedor con nombre»
    # ☑ pendientes: lista sencilla (sin fechas ni responsables); texto de varias líneas; opcionalmente unido a una carpeta
    pend = datos.get("pendientes", f.get("pendientes")) or []
    f["pendientes"] = [{"id": str(x.get("id") or uuid.uuid4().hex[:10])[:20], "texto": str(x.get("texto", "")).strip()[:4000], "hecho": bool(x.get("hecho")),
                        **({"hecho_en": str(x.get("hecho_en") or hoy)[:10]} if x.get("hecho") else {}),
                        **({"ancla": str(x["ancla"])[:80]} if x.get("ancla") else {})}
                       for x in pend if isinstance(x, dict) and str(x.get("texto", "")).strip()][:500]
    f.setdefault("creado", hoy)
    f["actualizado"] = hoy
    return f


def _partes(partes, avisos):
    """Partes de la ficha: cada carpeta llega como {"ruta"} (se ancla) o {"ancla"} (ya anclada)."""
    out = []
    reg = registro()
    for p in partes or []:
        tipo = p.get("tipo", "otro")
        if tipo not in TIPOS:
            raise ValueError(f"Tipo de parte no válido: {tipo}")
        cs = []
        for c in p.get("carpetas", []):
            if c.get("remota") or str(c.get("ancla", "")).startswith("remota:"):  # etapa remota (VPS…): sin carpeta en este PC
                r = c.get("remota") or {}
                rid = str(c.get("ancla", ""))[7:] or uuid.uuid4().hex[:12]
                if not re.fullmatch(r"[0-9a-f]{6,32}", rid) or not str(r.get("nombre", "")).strip():
                    raise ValueError("Etapa remota no válida: necesita un nombre")
                cs.append({"ancla": "remota:" + rid, "remota": {"nombre": str(r["nombre"]).strip()[:60], "url": str(r.get("url", "")).strip()[:300]},
                           "etapa": str(c.get("etapa", ""))[:30], "activa": True})
                continue
            if c.get("archivo") or str(c.get("ancla", "")).startswith("archivo:"):  # acceso a un archivo suelto (sin ancla en el disco)
                ruta_a = str((c.get("archivo") or {}).get("ruta") or c.get("ruta") or "").strip()
                rid = str(c.get("ancla", ""))[8:] or uuid.uuid4().hex[:12]
                if not re.fullmatch(r"[0-9a-f]{6,32}", rid) or not ruta_a:
                    raise ValueError("Acceso a archivo no válido: necesita la ruta")
                if not str(c.get("ancla", "")).startswith("archivo:") and not larga(ruta_a).is_file():
                    avisos.append(f"No existe el archivo: {ruta_a}")
                    continue
                if not any(x["ancla"] == "archivo:" + rid for x in cs):
                    cs.append({"ancla": "archivo:" + rid, "archivo": {"ruta": str(Path(os.path.abspath(corta(ruta_a))))}, "activa": True})
                continue
            if c.get("ancla"):
                if c["ancla"] not in reg:
                    raise ValueError("Ancla desconocida")
                i = c["ancla"]
            else:
                try:
                    i, av = poner_ancla(c["ruta"])
                except (ValueError, OSError) as e:  # sin permiso, solo lectura, ya no está…: se salta y se avisa
                    avisos.append(f"No se pudo anclar {c['ruta']}: {e}")
                    actividad("ancla", f"No se pudo anclar: {e}", c["ruta"], "error")
                    continue
                avisos.extend(av)
            item = {"ancla": i, "activa": bool(c.get("activa", True))}
            if c.get("icono"):
                item["icono"] = str(c["icono"])[:8]
            if c.get("indice") in INDICE:
                item["indice"] = c["indice"]
            if tipo == "entornos":
                item["etapa"] = str(c.get("etapa") or etapa_sugerida(Path(c.get("ruta") or reg.get(i, {}).get("ruta", "")).name))[:30]
            if not any(x["ancla"] == i for x in cs):
                cs.append(item)
        out.append({"nombre": str(p.get("nombre") or tipo.capitalize())[:60], "tipo": tipo, "carpetas": cs})
    return out


def crear_ficha(datos):
    """Crea la ficha y pone las anclas de sus carpetas. Devuelve (ficha, avisos)."""
    with _fichas_lock:
        avisos = []
        f = _limpiar(datos)
        base = slug(datos.get("id") or f["nombre"])
        i, n = base, 2
        while _ficha_path(i).exists():
            i, n = f"{base}-{n}", n + 1
        f = {"id": i, **f, "partes": _partes(datos.get("partes"), avisos)}
        if datos.get("principal_ruta"):  # «＋ Nuevo proyecto»: la ★ llega como ruta (aún no tenía ancla)
            f["principal"] = _ancla_de_ruta(f, datos["principal_ruta"]) or f.get("principal", "")
        if "nombre_sigue" not in datos and not f.get("raiz_nombre") and f["nombre"] == nombre_principal(f):
            f["nombre_sigue"] = True  # se llama como su carpeta principal: la sigue si la renombras
        escribir_json(_ficha_path(i), f)
        actividad("ficha", f"Ficha creada: {f['nombre']}", str(_ficha_path(i)))
        guardar_version(i)
        mapa_luego()
    _quitar_de_otros(datos.get("carpetas_movidas") or {}, f)
    return f, avisos


def guardar_ficha(i, datos):
    """Cambia una ficha existente (lo que no llega se conserva). Devuelve (ficha, avisos)."""
    with _fichas_lock:
        p = _ficha_path(i)
        previa = leer_json(p, None)
        if not previa:
            raise ValueError("No existe ese proyecto")
        avisos = []
        f = _limpiar(datos, previa)
        if "partes" in datos:
            f["partes"] = _partes(datos["partes"], avisos)
        escribir_json(p, f)
        actividad("ficha", f"Ficha guardada: {f['nombre']}", str(p))
        guardar_version(i)
        mapa_luego()
        return f, avisos


def quitar_ficha(i):
    """Quita el proyecto del organizador. No borra nada del disco: las anclas se quedan donde están.
    La ficha va a quitados/ con la ruta de cada ancla (_anclas), para poder recuperarla aunque luego se borren."""
    with _fichas_lock:
        p = _ficha_path(i)
        f = leer_json(p, {})
        if not p.exists():
            raise ValueError("No existe ese proyecto")
        reg = registro()
        f["_anclas"] = {c["ancla"]: reg[c["ancla"]]["ruta"] for q in f.get("partes", []) for c in q.get("carpetas", [])
                        if c.get("ancla") in reg and reg[c["ancla"]].get("ruta")}
        f["_quitado"] = datetime.now().isoformat(timespec="seconds")
        papelera = DATA / "quitados" / f"{i}-{int(time.time() * 1000)}.json"
        papelera.parent.mkdir(parents=True, exist_ok=True)
        escribir_json(papelera, f)  # se puede recuperar (⚙ › Proyectos quitados)
        p.unlink()
        actividad("ficha", f"Proyecto quitado del organizador: {f.get('nombre', i)} (copia en quitados/)", str(papelera))
        mapa_luego()
        return papelera


def quitar_fichas(ids, borrar_anclas=False):
    """Quita varios proyectos (casillas de la vista Lista). Con `borrar_anclas`, borra también el archivo
    .desklens-ancla de sus carpetas, salvo las que siguen en un proyecto que se queda. Nunca toca nada más."""
    ids = [i for i in dict.fromkeys(ids or []) if i]
    if not ids:
        raise ValueError("No hay proyectos marcados")
    quedan = {c["ancla"]: f.get("nombre", f["id"]) for f in fichas_crudas() if f["id"] not in ids
              for q in f.get("partes", []) for c in q.get("carpetas", [])}
    reg = registro()
    out = {"quitados": [], "anclas_borradas": [], "anclas_conservadas": [], "avisos": []}
    anclas = {}
    for i in ids:
        f = leer_json(_ficha_path(i), None)
        if not f:
            out["avisos"].append(f"No existe el proyecto {i}")
            continue
        for q in f.get("partes", []):
            for c in q.get("carpetas", []):
                if ID_RE.fullmatch(c.get("ancla", "")):
                    anclas[c["ancla"]] = reg.get(c["ancla"], {}).get("ruta", "")
        out["quitados"].append({"id": i, "nombre": f.get("nombre", i), "archivo": quitar_ficha(i).name})
    if borrar_anclas:
        for a, ruta in anclas.items():
            if a in quedan:
                out["anclas_conservadas"].append({"ruta": ruta, "proyecto": quedan[a]})
                continue
            if not ruta or leer_ancla(ruta) != a:  # no está donde se apuntó: no se borra nada a ciegas
                continue
            try:
                (larga(ruta) / ANCLA).unlink()
            except OSError as e:
                out["avisos"].append(f"No se pudo borrar {Path(ruta) / ANCLA}: {e}")
                continue
            with _anclas_lock:
                r = registro()
                r.pop(a, None)
                escribir_json(DATA / "anclas.json", r)
            out["anclas_borradas"].append(ruta)
            actividad("ancla", "Ancla borrada al quitar el proyecto", str(Path(ruta) / ANCLA))
        mapa_luego()
    return out


def quitados():
    """Proyectos quitados del organizador (carpeta quitados/ de los datos), del más reciente al más antiguo."""
    out = []
    for p in (DATA / "quitados").glob("*.json"):
        f = leer_json(p, None)
        if not isinstance(f, dict) or not f.get("id"):
            continue
        n = sum(len(q.get("carpetas", [])) for q in f.get("partes", []))
        out.append({"archivo": p.name, "id": f["id"], "nombre": f.get("nombre", f["id"]), "carpetas": n,
                    "quitado": f.get("_quitado") or datetime.fromtimestamp(p.stat().st_mtime).isoformat(timespec="seconds"),
                    "existe": _ficha_path(f["id"]).exists()})
    return sorted(out, key=lambda x: x["quitado"], reverse=True)


def _quitado_path(nombre):
    if not re.fullmatch(r"[a-z0-9-]{1,80}-\d+\.json", nombre or ""):
        raise ValueError("Archivo de quitados no válido")
    return DATA / "quitados" / nombre


def recuperar_quitados(archivos):
    """↶ Recuperar: la ficha vuelve al tablero. Si se borró el ancla de una carpeta, se vuelve a poner con el mismo id."""
    hechos, avisos = [], []
    for a in archivos or []:
        q = _quitado_path(a)
        f = leer_json(q, None)
        if not f:
            avisos.append(f"No está en quitados: {a}")
            continue
        with _fichas_lock:
            p = _ficha_path(f["id"])
            if p.exists():
                avisos.append(f"«{f.get('nombre', f['id'])}» ya está en el tablero: no se recupera encima")
                continue
            for anc, ruta in (f.pop("_anclas", None) or {}).items():
                if not ID_RE.fullmatch(anc) or not ruta or not larga(ruta).is_dir():
                    continue
                if not (larga(ruta) / ANCLA).exists():
                    (larga(ruta) / ANCLA).write_text(json.dumps({"id": anc, "creada": datetime.now().isoformat(timespec="seconds")}), encoding="utf-8")
                    ocultar(larga(ruta) / ANCLA)
                    actividad("ancla", "Ancla vuelta a poner al recuperar el proyecto", str(Path(ruta) / ANCLA))
                if leer_ancla(ruta) == anc:
                    _registrar(anc, ruta)
            f.pop("_quitado", None)
            escribir_json(p, f)
            q.unlink()
        actividad("ficha", f"Proyecto recuperado: {f.get('nombre', f['id'])}", str(p))
        hechos.append(f["id"])
    mapa_luego()
    return hechos, avisos


def vaciar_quitados(archivos=None):
    """Borra de verdad copias de quitados (todas si no se dice cuáles). Las carpetas no se tocan."""
    ps = [_quitado_path(a) for a in archivos] if archivos else list((DATA / "quitados").glob("*.json"))
    n = 0
    for p in ps:
        if p.exists():
            p.unlink()
            n += 1
    actividad("ficha", f"Quitados vaciados: {n} copia(s) borrada(s)", str(DATA / "quitados"))
    return n


def fichas(ubicar_anclas=True):
    """Fichas con lo calculado al abrir: ruta y estado de cada carpeta, en cuántos proyectos está, nº de partes."""
    reg = registro()
    todas = fichas_crudas()
    usos = {}
    for f in todas:
        for p in f.get("partes", []):
            for c in p.get("carpetas", []):
                usos.setdefault(c["ancla"], set()).add(f["id"])
    estados = {}
    for f in todas:
        for p in f.get("partes", []):
            for c in p.get("carpetas", []):
                i = c["ancla"]
                if i.startswith("remota:"):  # etapa remota: su dirección hace de ruta
                    c.update(ruta=c["remota"].get("url", ""), estado="remota", nombre=c["remota"]["nombre"], icono_propio=False,
                             icono="🌍", proyectos=[f["id"]], git=False, eliminada="")
                    continue
                if i.startswith("archivo:"):  # acceso a archivo: está o no está en su ruta (no lleva ancla)
                    ra = c["archivo"].get("ruta", "")
                    ok = larga(ra).is_file() if ra else False
                    c.update(ruta=ra, estado="ok" if ok else "falta", nombre=Path(ra).name or "?", icono_propio=False, icono="📄",
                             proyectos=[f["id"]], git=False, eliminada="", acceso=True)
                    continue
                if i not in estados:
                    estados[i] = ubicar(i, reg) if ubicar_anclas else ("ok", reg.get(i, {}).get("ruta", ""))
                est, ruta = estados[i]
                c["ruta"], c["estado"] = ruta, est
                c["nombre"] = Path(ruta).name if ruta else "?"
                c["icono_propio"] = "icono" in c  # elegido a mano (si no, el sugerido por el nombre)
                c.setdefault("icono", icono_sugerido(c["nombre"], (Path(ruta) / ".git").exists() if est in ("ok", "movida") else False))
                c["proyectos"] = sorted(usos.get(i, ()))
                c["git"] = est in ("ok", "movida") and (Path(ruta) / ".git").exists()
                c["eliminada"] = registro().get(i, {}).get("eliminada", "") if est in ("papelera", "eliminada") else ""  # recién apuntado por ubicar()
        rutas = {c["ancla"]: c["ruta"] for p in f.get("partes", []) for c in p.get("carpetas", []) if c["estado"] in ("ok", "movida")}
        elegida = f.get("principal")
        f["principal"] = principal_de(f, lambda a: rutas.get(a, ""))
        f["principal_elegida"] = bool(elegida) and elegida == f["principal"]
        if f.get("nombre_sigue") and rutas.get(f["principal"]):
            f["nombre"] = Path(rutas[f["principal"]]).name  # el proyecto se llama como su carpeta principal
        f["avisos"] = sum(1 for p in f.get("partes", []) for c in p.get("carpetas", []) if c["estado"] in NO_ESTAN)
        f["papelera"] = sum(1 for p in f.get("partes", []) for c in p.get("carpetas", []) if c["estado"] in ("papelera", "eliminada"))
    return todas


def rutas_indice():
    """Carpetas de las fichas que el índice de DeskLens debe leer, con su modo: el de la carpeta si se eligió a mano,
    si no el de su tipo de parte (⚙ Ajustes › Proyectos). Respaldos y bases de datos nunca (solo se ven).
    Si una carpeta está en varios proyectos manda el modo que más lee."""
    a, reg, out = ajustes(), registro(), {}
    peso = {m: i for i, m in enumerate(INDICE[::-1])}  # no < nombres < nombres_pdf < todo
    for f in fichas_crudas():
        for p in f.get("partes", []):
            for c in p.get("carpetas", []):
                if p.get("tipo") in ("respaldos", "base_datos") or c["ancla"] not in reg or not c.get("activa", True):
                    continue
                modo = c.get("indice") or a["indice"].get(p.get("tipo"), "nombres")
                ruta = reg[c["ancla"]]["ruta"]
                if modo != "no" and not en_papelera(ruta) and peso[modo] > peso.get(out.get(ruta, "no"), 0):
                    out[ruta] = modo
    return sorted(out.items())


_permitidas = {"marca": None, "rutas": []}


def rutas_permitidas():
    """Carpetas ancladas en alguna ficha (DeskLens las puede mostrar como las de un proyecto). Se recalcula solo si
    cambió anclas.json o la carpeta de fichas: allowed() lo llama en cada petición."""
    try:
        marca = (os.stat(DATA / "anclas.json").st_mtime_ns, os.stat(DATA / "proyectos").st_mtime_ns)
    except OSError:
        return []
    if marca != _permitidas["marca"]:
        reg = registro()
        cs = [c for f in fichas_crudas() for p in f.get("partes", []) for c in p.get("carpetas", [])]
        ids = {c["ancla"] for c in cs}
        _permitidas.update(marca=marca, rutas=[Path(reg[i]["ruta"]).resolve() for i in ids if i in reg] + [DATA.resolve()]
                           + [Path(c["archivo"]["ruta"]).resolve() for c in cs if c.get("archivo", {}).get("ruta")])
    return _permitidas["rutas"]


NO_ESTAN = ("falta", "desconectado", "papelera", "eliminada")  # estados que salen en ⚠


def quitar_carpeta(proyecto_id, ancla):
    """Quita una carpeta de una ficha (p. ej. la que se envió a la papelera). No toca el disco."""
    with _fichas_lock:
        p = _ficha_path(proyecto_id)
        f = leer_json(p, None)
        if not f:
            raise ValueError("No existe ese proyecto")
        ruta = registro().get(ancla, {}).get("ruta", ancla)
        for parte in f.get("partes", []):
            parte["carpetas"] = [c for c in parte["carpetas"] if c["ancla"] != ancla]
        f["actualizado"] = datetime.now().date().isoformat()
        escribir_json(p, f)
        actividad("ficha", f"Carpeta quitada de {f['nombre']}", ruta)
    guardar_version(proyecto_id)
    mapa_luego()
    return f


def mover_carpeta(proyecto_id, ancla, tipo, nombre=""):
    """Pasa una carpeta a otra parte del proyecto (la primera de ese tipo; si no hay, se crea). Solo cambia la ficha:
    nada se mueve en el disco. Una parte que queda vacía se quita. Al entrar en Entornos toma la etapa por su nombre."""
    if tipo not in TIPOS:
        raise ValueError(f"Tipo de parte no válido: {tipo}")
    with _fichas_lock:
        p = _ficha_path(proyecto_id)
        f = leer_json(p, None)
        if not f:
            raise ValueError("No existe ese proyecto")
        item = origen = None
        for parte in f.get("partes", []):
            for c in parte["carpetas"]:
                if c["ancla"] == ancla:
                    item, origen = c, parte
        if not item:
            raise ValueError("Esa carpeta no está en el proyecto")
        if origen.get("tipo") == tipo:
            return f
        if ancla.startswith("remota:") and tipo != "entornos":
            raise ValueError("Una etapa remota solo puede ir en Entornos")
        if ancla.startswith("archivo:") and tipo == "entornos":
            raise ValueError("Un archivo no puede ser una etapa de Entornos")
        origen["carpetas"].remove(item)
        destino = next((x for x in f["partes"] if x.get("tipo") == tipo), None)
        if not destino:
            destino = {"nombre": (str(nombre).strip() or tipo.capitalize())[:60], "tipo": tipo, "carpetas": []}
            f["partes"].insert(f["partes"].index(origen) + 1, destino)
        ruta = registro().get(ancla, {}).get("ruta", "")
        if tipo == "entornos":
            item["etapa"] = item.get("etapa") or etapa_sugerida(Path(ruta).name)
        else:
            item.pop("etapa", None)
        cs = destino["carpetas"]
        if tipo == "entornos":  # en su sitio: pruebas → calidad → producción (las etapas propias van al final)
            orden = {n: k for k, (_, n) in enumerate(ETAPAS)}
            k = orden.get(item["etapa"], len(orden))
            cs.insert(next((j for j, x in enumerate(cs) if orden.get(x.get("etapa"), len(orden)) > k), len(cs)), item)
        else:
            cs.append(item)
        if not origen["carpetas"]:
            f["partes"].remove(origen)
        f["actualizado"] = datetime.now().date().isoformat()
        escribir_json(p, f)
        actividad("ficha", f"{f['nombre']}: carpeta pasada de {origen['nombre']} a {destino['nombre']}", ruta or ancla)
    guardar_version(proyecto_id)
    mapa_luego()
    return f


# ---------- ⓘ Panel de información: datos de una carpeta y su peso (en segundo plano, con avance, 5 min en memoria) ----------
_pesos, _pesos_lock = {}, threading.Lock()
PESO_VIDA, PESO_A_LA_VEZ = 300, 3


def dentro_de_proyecto(ruta):
    """Solo carpetas y archivos que están dentro de alguna carpeta anclada (el panel no mira el resto del disco)."""
    try:
        p = Path(corta(ruta)).resolve()
    except (OSError, ValueError):
        return False
    return any(p == r or r in p.parents for r in rutas_permitidas() if r != DATA.resolve())


def _medir(e, ruta):
    """Recorre la carpeta sumando tamaños; también el peso de cada hijo directo (para la lista del panel). Sin seguir
    enlaces ni uniones (podrían dar vueltas). e["parar"] lo detiene."""
    try:
        pila = []
        for d in os.scandir(larga(ruta)):
            if d.name != ANCLA:  # la marca de DeskLens no cuenta (el panel tampoco la lista)
                pila.append((d, d.name))
        while pila:
            if e["parar"]:
                e["estado"] = "detenido"
                return
            d, hijo = pila.pop()
            try:
                st = d.stat(follow_symlinks=False)
                if d.is_symlink() or getattr(st, "st_file_attributes", 0) & 0x400:  # enlace o unión
                    continue
                if d.is_dir(follow_symlinks=False):
                    e["carpetas"] += 1
                    pila.extend((x, hijo) for x in os.scandir(d.path))
                else:
                    e["archivos"] += 1
                    e["bytes"] += st.st_size
                    e["hijos"][hijo] = e["hijos"].get(hijo, 0) + st.st_size
            except OSError:
                e["sin_acceso"] += 1
        e["estado"] = "listo"
    except OSError as x:
        e.update(estado="error", error=str(x))
    finally:
        e["fin"] = time.time()


def peso_carpeta(ruta, iniciar=True):
    """Estado del cálculo del peso de `ruta`: calculando (con lo sumado hasta ahora), listo, en_cola, detenido o error."""
    k = corta(ruta).lower()
    with _pesos_lock:
        e = _pesos.get(k)
        vivo = e and (e["estado"] == "calculando" or e["estado"] == "listo" and time.time() - e["fin"] < PESO_VIDA)
        if not vivo and iniciar:
            if sum(1 for x in _pesos.values() if x["estado"] == "calculando") >= PESO_A_LA_VEZ:
                return {"estado": "en_cola", "bytes": 0, "carpetas": 0, "archivos": 0, "hijos": {}}
            e = _pesos[k] = {"estado": "calculando", "bytes": 0, "carpetas": 0, "archivos": 0, "sin_acceso": 0, "hijos": {},
                             "inicio": time.time(), "fin": 0, "parar": False}
            threading.Thread(target=_medir, args=(e, corta(ruta)), daemon=True).start()
        if not e:
            return {"estado": "sin_calcular"}
        return {k2: (dict(v) if k2 == "hijos" else v) for k2, v in e.items() if k2 != "parar"}


def parar_peso(ruta):
    with _pesos_lock:
        e = _pesos.get(corta(ruta).lower())
        if e and e["estado"] == "calculando":
            e["parar"] = True


def info_carpeta(ruta, peso=True):
    """Datos de una carpeta para el panel ⓘ: fechas, atributos y su peso (si se pide)."""
    if not dentro_de_proyecto(ruta):
        raise ValueError("Esa carpeta no está dentro de un proyecto")
    st = os.stat(larga(ruta))
    attrs = getattr(st, "st_file_attributes", 0)
    return {"nombre": Path(corta(ruta)).name, "ruta": corta(ruta), "modificado": st.st_mtime, "creado": getattr(st, "st_birthtime", st.st_ctime),
            "atributos": [n for bit, n in ((1, "solo lectura"), (2, "oculto"), (4, "sistema")) if attrs & bit] or ["normal"],
            "git": os.path.isdir(os.path.join(larga(ruta), ".git")), **({"peso": peso_carpeta(ruta)} if peso else {})}


def abrir_papelera():
    """Abre la papelera de Windows (para restaurar desde allí: DeskLens no la vacía ni restaura por su cuenta)."""
    if not WINDOWS:
        raise ValueError("Solo en Windows")
    subprocess.Popen(["explorer.exe", "shell:RecycleBinFolder"])


def alertas():
    """⚠ Anclas no encontradas: las de alguna ficha que no están en su sitio (ni por ID de NTFS)."""
    out, vistos = [], set()
    for f in fichas():
        for p in f.get("partes", []):
            for c in p.get("carpetas", []):
                if c["estado"] in NO_ESTAN and (c["ancla"], f["id"]) not in vistos:
                    vistos.add((c["ancla"], f["id"]))
                    d = registro().get(c["ancla"], {})
                    out.append({"id": c["ancla"], "proyecto": f["nombre"], "proyecto_id": f["id"], "parte": p["nombre"],
                                "tipo": p["tipo"], "ruta": c["ruta"], "estado": c["estado"], "visto": d.get("visto", ""),
                                "eliminada": c["eliminada"]})
    return out


def convertir_proyectos(rutas):
    """Hueco 2: los proyectos que ya tiene DeskLens pasan a fichas (su carpeta como parte 💻 Código). Devuelve las fichas."""
    hechas, avisos = [], []
    ya = {c["ruta"].lower() for f in fichas(False) for p in f["partes"] for c in p["carpetas"]}
    for r in rutas:
        p = Path(r)
        if not p.is_dir() or str(p).lower() in ya:
            continue
        f, av = crear_ficha({"nombre": p.name, "partes": [{"nombre": "Código", "tipo": tipo_sugerido(p, True),
                                                           "carpetas": [{"ruta": str(p)}]}]})
        hechas.append(f)
        avisos.extend(av)
    return hechas, avisos


# ---------- ＋ Nuevo proyecto a mano y ＋ Añadir carpetas (aprobado 2026-11-22) ----------

def _ancla_de_ruta(f, ruta):
    """Ancla de la ficha `f` que está en `ruta` ('' si ninguna)."""
    reg, r = registro(), os.path.normcase(os.path.abspath(corta(ruta)))
    for p in f.get("partes", []):
        for c in p.get("carpetas", []):
            if os.path.normcase(os.path.abspath(reg.get(c["ancla"], {}).get("ruta", "") or "?")) == r:
                return c["ancla"]
    return ""


def _quitar_de_otros(movidas, f):
    """«Mover aquí»: {ruta: [ids de los proyectos de donde se quita]}. La carpeta queda solo en `f`."""
    for ruta, ids in movidas.items():
        a = _ancla_de_ruta(f, ruta)
        for i in ids or []:
            if a and i != f["id"]:
                try:
                    quitar_carpeta(i, a)
                except ValueError:
                    pass


def _usos_por_ruta():
    """{ruta normalizada: {ids de proyectos}} y {id: nombre}, de carpetas ancladas y accesos a archivos."""
    reg, usos, nombres = registro(), {}, {}
    for f in fichas_crudas():
        nombres[f["id"]] = f.get("nombre", f["id"])
        for q in f.get("partes", []):
            for c in q.get("carpetas", []):
                rc = reg.get(c["ancla"], {}).get("ruta") or (c.get("archivo") or {}).get("ruta")
                if rc:
                    usos.setdefault(os.path.normcase(rc), set()).add(f["id"])
    return usos, nombres


def analizar_ruta(ruta):
    """Lo que el modal necesita saber de una ruta antes de añadirla: si existe, si es carpeta o archivo, tipo y etapa
    sugeridos, si tiene git, en qué proyectos está ya y si cuelga de (o contiene) carpetas de otros proyectos."""
    ruta = str(ruta or "").strip().strip('"')
    if not ruta:
        raise ValueError("Escribe una ruta")
    p = Path(os.path.abspath(corta(ruta)))
    L = larga(p)
    out = {"ruta": str(p), "nombre": p.name or str(p), "existe": L.exists(), "dir": L.is_dir()}
    if not out["existe"]:
        return out
    if out["dir"] and p == Path(p.anchor):
        out["error"] = "Es un disco entero: elige una carpeta dentro de él"
    git = out["dir"] and (L / ".git").exists()
    codigo = git or (out["dir"] and any((L / m).exists() for m in MARCAS))
    out.update(git=git, tipo=tipo_sugerido(p, codigo) if out["dir"] else "documentos", etapa=etapa_sugerida(p.name),
               icono=icono_sugerido(p.name, git) if out["dir"] else "📄")
    if out["tipo"] == "otro" and normalizar(p.name).startswith("bk"):
        out["tipo"] = "respaldos"
    out["ancla"] = (leer_ancla(p) if out["dir"] else None) or ""
    usos, nombres = _usos_por_ruta()
    yo = os.path.normcase(str(p))
    out["proyectos"] = [{"id": i, "nombre": nombres[i]} for i in sorted(usos.get(yo, ())) if i in nombres]
    out["dentro_de"], out["contiene"] = [], []
    for rc, ids in usos.items():
        if rc == yo:
            continue
        if yo.startswith(rc.rstrip("\\/") + os.sep):
            out["dentro_de"].append({"ruta": rc, "proyectos": [nombres.get(i, i) for i in sorted(ids)], "ids": sorted(ids)})
        elif rc.startswith(yo.rstrip("\\/") + os.sep):
            out["contiene"].append({"ruta": rc, "proyectos": [nombres.get(i, i) for i in sorted(ids)], "ids": sorted(ids)})
    out["contiene"] = out["contiene"][:20]
    return out


def sugerencias(nombre, excluir=(), limite=40):
    """Carpetas con nombre parecido a `nombre`, al instante, de los nombres que guardó el último recorrido de discos
    (carpetas.db). No se recorre nada: si ningún disco se recorrió, se dice. Nada que cuelgue de `excluir`."""
    clave = normalizar(nombre or "")
    discos_info = [{"letra": d.get("letra", ""), "visto": d.get("visto", "")} for d in config_discos().values() if d.get("activo")]
    base = {"carpetas": [], "discos": discos_info, "clave": clave}
    if len(clave) < 4 or clave in GENERICAS:
        return {**base, "aviso": "Escribe un nombre de 4 letras o más (no genérico) para ver carpetas parecidas"}
    ex = [os.path.abspath(corta(x)) for x in excluir if x]
    try:
        con = db()
        e = clave.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        filas = con.execute("SELECT ruta, nombre, marca FROM carpetas WHERE clave LIKE ? ESCAPE '\\' ORDER BY length(ruta) LIMIT 400",
                            (f"%{e}%",)).fetchall()
        con.close()
    except sqlite3.Error:
        filas = []
    usos, nombres = _usos_por_ruta()
    tomadas, out = list(ex), []
    for ruta, nom, marca in filas:
        if any(os.path.normcase(ruta) == os.path.normcase(t) for t in tomadas) or _dentro(ruta, tomadas):
            continue
        if not os.path.isdir(larga(ruta)):  # el recorrido es de otro día: ya no está
            continue
        tomadas.append(ruta)
        try:
            fecha = datetime.fromtimestamp(os.stat(larga(ruta)).st_mtime).isoformat(timespec="minutes")
        except OSError:
            fecha = ""
        ids = sorted(usos.get(os.path.normcase(ruta), ()))
        out.append({"ruta": ruta, "nombre": nom, "tipo": tipo_sugerido(ruta, marca in ("git", "codigo")),
                    "etapa": etapa_sugerida(nom), "git": marca == "git", "fecha": fecha,
                    "proyectos": [{"id": i, "nombre": nombres.get(i, i)} for i in ids]})
        if len(out) >= limite:
            break
    return {**base, "carpetas": out,
            "aviso": "" if any(d["visto"] for d in discos_info) else "Aún no se recorrió ningún disco: usa 🔍 Buscar en discos para tener sugerencias"}


SALTAR_BUSCAR = SALTAR_NOMBRES | {"windows", "program files", "program files (x86)", "programdata", "appdata", "recovery", "perflogs"}


def buscar_carpetas(en, q, archivos=False, limite=200, segundos=4.0, profundidad=6):
    """🔍 del explorador de ＋ Nuevo proyecto: busca por nombre (sin mayúsculas ni acentos) dentro de `en` y sus
    subcarpetas, en vivo, por niveles (primero lo de arriba). Se salta node_modules, .git, ocultas y de sistema.
    Para en `limite` resultados, `profundidad` niveles o `segundos`, y lo dice en `motivo`."""
    raiz = Path(os.path.abspath(corta(str(en or "").strip().strip('"'))))
    clave = normalizar(q or "")
    if not clave:
        raise ValueError("Escribe qué buscar")
    if not larga(raiz).is_dir():
        raise ValueError(f"No existe la carpeta: {raiz}")
    fin, out, nivel, vistas = time.monotonic() + segundos, [], [raiz], 0
    motivo = ""
    for prof in range(1, profundidad + 1):
        siguiente = []
        for c in nivel:
            try:
                with os.scandir(larga(c)) as it:
                    hijos = sorted(it, key=lambda e: e.name.lower())
            except OSError:
                continue
            for e in hijos:
                vistas += 1
                try:
                    es_dir = e.is_dir(follow_symlinks=False)
                except OSError:
                    continue
                n = e.name
                if es_dir and (n.lower() in SALTAR_BUSCAR or n.startswith((".", "$")) or n == ANCLA):
                    continue
                if not es_dir and (not archivos or n == ANCLA):
                    continue
                ruta = c / n
                if clave in normalizar(n):
                    out.append({"ruta": str(ruta), "nombre": n, "dir": es_dir, "nivel": prof})
                    if len(out) >= limite:
                        return {"resultados": out, "completo": False, "motivo": f"Solo los primeros {limite}", "vistas": vistas}
                if es_dir:
                    siguiente.append(ruta)
            if time.monotonic() > fin:
                return {"resultados": out, "completo": False, "motivo": f"Se paró a los {int(segundos)} s", "vistas": vistas}
        nivel = siguiente
        if not nivel:
            break
    else:
        motivo = f"Hasta {profundidad} niveles"
    return {"resultados": out, "completo": not motivo, "motivo": motivo, "vistas": vistas}


def anadir_carpetas(proyecto_id, carpetas, principal_ruta="", movidas=None):
    """＋ Añadir carpetas a un proyecto existente: cada una {ruta | archivo:{ruta} | remota, tipo, etapa} va a la primera
    parte de su tipo (se crea si no hay). Pone las anclas. Devuelve (ficha, avisos)."""
    with _fichas_lock:
        p = _ficha_path(proyecto_id)
        f = leer_json(p, None)
        if not f:
            raise ValueError("No existe ese proyecto")
        avisos, partes = [], f.setdefault("partes", [])
        for c in carpetas or []:
            tipo = c.get("tipo") if c.get("tipo") in TIPOS else "otro"
            nuevas = _partes([{"tipo": tipo, "carpetas": [c]}], avisos)[0]["carpetas"]
            if not nuevas:
                continue
            n = nuevas[0]
            if any(x["ancla"] == n["ancla"] for q in partes for x in q.get("carpetas", [])):
                avisos.append(f"Ya estaba en el proyecto: {c.get('ruta') or n['ancla']}")
                continue
            dest = next((q for q in partes if q.get("tipo") == tipo), None)
            if not dest:
                dest = {"nombre": c.get("parte") or NOMBRE_TIPO.get(tipo, tipo.capitalize()), "tipo": tipo, "carpetas": []}
                partes.append(dest)
            dest["carpetas"].append(n)
            if tipo == "entornos":
                dest["carpetas"].sort(key=lambda x: ORDEN_ETAPA.get(x.get("etapa", ""), 9))
            actividad("ficha", f"Añadida a {f.get('nombre', proyecto_id)}", c.get("ruta") or (c.get("archivo") or {}).get("ruta", ""))
        if principal_ruta:
            a = _ancla_de_ruta(f, principal_ruta)
            if a:
                f["principal"] = a
        f["actualizado"] = datetime.now().date().isoformat()
        escribir_json(p, f)
    _quitar_de_otros(movidas or {}, {**f, "id": proyecto_id})
    guardar_version(proyecto_id)
    mapa_luego()
    return leer_json(p, f), avisos


# ---------- notas en nodos y conectores (Markdown, una por archivo en notas/) ----------
# Cabecera mínima y luego el texto. destino: proyecto · nodo:<ancla> · parte:<n> · conector:<id> · caja:<id>

DESTINO_RE = re.compile(r"(proyecto|nodo:((remota|archivo):)?[0-9a-f]{6,32}|parte:\d{1,3}|conector:[\w:>-]{1,120}|caja:[\w-]{1,40})")


def _nota_leer(p):
    try:
        t = p.read_text(encoding="utf-8")
    except OSError:
        return None
    if not t.startswith("---\n"):
        return None
    cab, _, cuerpo = t[4:].partition("\n---\n")
    d = dict(ln.split(": ", 1) for ln in cab.splitlines() if ": " in ln)
    return {"id": p.stem, "proyecto": d.get("proyecto", ""), "destino": d.get("destino", ""), "creada": d.get("creada", ""),
            "cambiada": d.get("cambiada", ""), "texto": cuerpo}


def notas(proyecto_id):
    """Notas de un proyecto, de la más nueva a la más vieja."""
    out = [n for n in (_nota_leer(p) for p in (DATA / "notas").glob("*.md")) if n and n["proyecto"] == proyecto_id]
    return sorted(out, key=lambda n: n["creada"], reverse=True)


def guardar_nota(proyecto_id, destino, texto, nid=""):
    """Crea o cambia una nota (Markdown). Queda en el historial de la estructura del proyecto."""
    _ficha_path(proyecto_id)
    if not DESTINO_RE.fullmatch(destino or ""):
        raise ValueError("Destino de nota no válido")
    if nid and not re.fullmatch(r"[0-9a-f]{32}", nid):
        raise ValueError("Nota no válida")
    nid = nid or uuid.uuid4().hex
    p = DATA / "notas" / f"{nid}.md"
    antes = _nota_leer(p) if p.exists() else None
    ahora = datetime.now().isoformat(timespec="seconds")
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(f"---\nproyecto: {proyecto_id}\ndestino: {destino}\ncreada: {antes['creada'] if antes else ahora}\n"
                 f"cambiada: {ahora}\n---\n{str(texto)[:20000]}", encoding="utf-8")
    actividad("nota", f"Nota {'cambiada' if antes else 'nueva'} en {proyecto_id} ({destino})", str(p))
    guardar_version(proyecto_id)
    return _nota_leer(p)


def borrar_nota(proyecto_id, nid):
    if not re.fullmatch(r"[0-9a-f]{32}", nid or ""):
        raise ValueError("Nota no válida")
    p = DATA / "notas" / f"{nid}.md"
    n = _nota_leer(p)
    if not n or n["proyecto"] != proyecto_id:
        raise ValueError("No existe esa nota")
    p.unlink()
    actividad("nota", f"Nota borrada de {proyecto_id} ({n['destino']})", str(p))
    guardar_version(proyecto_id)


# ---------- historial de la estructura (siempre se guarda: sin tope ni días) ----------
# Cada punto es una copia comprimida de la ficha + sus notas + el nombre de cada ancla (para ver lo quitado).
# Automáticos: los cambios de 5 minutos seguidos se juntan en uno. Con nombre: «Guardar versión». No se borran.

import gzip  # noqa: E402  (solo lo usa el historial)


def _vdir(i):
    _ficha_path(i)
    return DATA / "versiones" / i


def _instantanea(i):
    f = leer_json(_ficha_path(i), None)
    if not f:
        raise ValueError("No existe ese proyecto")
    reg = registro()
    ids = {c["ancla"] for p in f.get("partes", []) for c in p.get("carpetas", [])}
    remotas = {c["ancla"]: c["remota"] for p in f.get("partes", []) for c in p.get("carpetas", []) if c.get("remota")}
    remotas |= {c["ancla"]: {"url": c["archivo"]["ruta"], "nombre": Path(c["archivo"]["ruta"]).name}
                for p in f.get("partes", []) for c in p.get("carpetas", []) if c.get("archivo")}
    return {"ficha": f, "notas": notas(i), "anclas": {a: ({"ruta": remotas[a].get("url", ""), "nombre": remotas[a]["nombre"]} if a in remotas else
                                                          {"ruta": reg.get(a, {}).get("ruta", ""), "nombre": Path(reg.get(a, {}).get("ruta", "?")).name})
                                                     for a in ids}}


def _sin_fecha(s):
    f = dict(s["ficha"])
    f.pop("actualizado", None)
    return json.dumps({**s, "ficha": f}, sort_keys=True, ensure_ascii=False)


def versiones(i):
    return leer_json(_vdir(i) / "indice.json", [])


def guardar_version(i, nombre=""):
    """Un punto del historial. Sin nombre: automático (se junta con el anterior si fue hace menos de 5 min).
    Con nombre: queda aparte y nunca se junta. No guarda nada si no cambió desde el último."""
    with _fichas_lock:
        try:
            s = _instantanea(i)
        except ValueError:
            return None
        d = _vdir(i)
        idx = versiones(i)
        ahora = datetime.now()
        ultimo = idx[-1] if idx else None
        if ultimo and not nombre:
            try:
                previa = json.loads(gzip.decompress((d / ultimo["archivo"]).read_bytes()))
                if _sin_fecha(previa) == _sin_fecha(s):
                    return ultimo
            except (OSError, ValueError):
                pass
        juntar = (not nombre and ultimo and ultimo.get("auto")
                  and ahora - datetime.fromisoformat(ultimo["fecha"]) < timedelta(minutes=5))
        v = ultimo["v"] if juntar else ahora.strftime("%Y%m%dT%H%M%S%f")[:18]
        while not juntar and any(x["v"] == v for x in idx):  # dos en el mismo milisegundo: no se pisan
            v = v[:15] + f"{int(v[15:18]) + 1:03d}" if int(v[15:18]) < 999 else v + "1"
        n_carp = sum(len(p.get("carpetas", [])) for p in s["ficha"].get("partes", []))
        entrada = {"v": v, "fecha": ahora.isoformat(timespec="seconds"), "nombre": str(nombre)[:80], "auto": not nombre,
                   "archivo": f"{v}.json.gz", "resumen": f"{len(s['ficha'].get('partes', []))} partes · {n_carp} carpetas · "
                   f"{len(s['ficha'].get('conexiones', []))} uniones · {len(s['notas'])} notas"}
        d.mkdir(parents=True, exist_ok=True)
        (d / entrada["archivo"]).write_bytes(gzip.compress(json.dumps(s, ensure_ascii=False).encode("utf-8")))
        if juntar:
            idx[-1] = entrada
        else:
            idx.append(entrada)
        escribir_json(d / "indice.json", idx)
        if nombre:
            actividad("version", f"Versión «{nombre}» guardada de {s['ficha'].get('nombre', i)}", str(d / entrada["archivo"]))
        return entrada


def leer_version(i, v, calcular=True):
    e = next((x for x in versiones(i) if x["v"] == v), None)
    if not e:
        raise ValueError("No existe esa versión")
    s = json.loads(gzip.decompress((_vdir(i) / e["archivo"]).read_bytes()))
    if calcular:
        s["ficha"]["principal"] = principal_de(s["ficha"], lambda a: s.get("anclas", {}).get(a, {}).get("ruta", ""))  # la de entonces
    return s


def commits_proyecto(i, n=40):
    """Commits de la carpeta de código (marcas en la línea de tiempo): con cada uno, la versión de la estructura que
    había en ese momento. Solo si la carpeta usa git y git está instalado; si no, lista vacía."""
    f = leer_json(_ficha_path(i), {})
    reg = registro()
    cod = next((reg[c["ancla"]]["ruta"] for p in f.get("partes", []) if p.get("tipo") == "codigo"
                for c in p.get("carpetas", []) if c["ancla"] in reg and (Path(reg[c["ancla"]]["ruta"]) / ".git").exists()), "")
    if not cod or not shutil.which("git"):
        return []
    try:
        r = subprocess.run(["git", "log", f"-{n}", "--format=%H%x09%h%x09%cI%x09%s"], cwd=cod, capture_output=True,
                           text=True, encoding="utf-8", errors="replace", timeout=10, creationflags=NO_WINDOW)
    except (OSError, subprocess.SubprocessError):
        return []
    vs = versiones(i)
    out = []
    for ln in r.stdout.splitlines():
        h, corto, fecha, titulo = (ln.split("\t") + ["", "", "", ""])[:4]
        try:
            fc = datetime.fromisoformat(fecha).replace(tzinfo=None)
        except ValueError:
            continue
        antes = [x for x in vs if datetime.fromisoformat(x["fecha"]) <= fc]
        out.append({"hash": h, "corto": corto, "fecha": fc.isoformat(timespec="seconds"), "titulo": titulo[:120],
                    "v": antes[-1]["v"] if antes else ""})
    return out


def restaurar_version(i, v):
    """Vuelve a una versión: crea un punto nuevo (la actual no se pierde, queda en el historial)."""
    s = leer_version(i, v, calcular=False)  # la principal tal como se guardó (elegida a mano o ninguna)
    guardar_version(i, f"antes de restaurar {v[:8]}")
    f = s["ficha"]
    guardar_ficha(i, {k: f[k] for k in ("nombre", "estado", "avance", "descripcion", "nota", "color", "tecnologia", "enlaces",
                                        "historial", "conexiones", "cajas", "posiciones", "nombre_sigue", "raiz_nombre", "pendientes") if k in f}
                  | {"principal": f.get("principal", "")}
                  | {"partes": [{"nombre": p["nombre"], "tipo": p["tipo"], "carpetas": [{"ancla": c["ancla"], "activa": c.get("activa", True),
                                                                                          **({"icono": c["icono"]} if c.get("icono") else {}),
                                                                                          **({"remota": c["remota"]} if c.get("remota") else {}),
                                                                                          **({"archivo": c["archivo"]} if c.get("archivo") else {}),
                                                                                          **({"etapa": c["etapa"]} if c.get("etapa") else {})}
                                                                         for c in p["carpetas"] if c.get("remota") or c.get("archivo") or c["ancla"] in registro()]}
                                for p in f.get("partes", [])]})
    for n in notas(i):  # las notas, como estaban
        (DATA / "notas" / f"{n['id']}.md").unlink(missing_ok=True)
    for n in s.get("notas", []):
        p = DATA / "notas" / f"{n['id']}.md"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(f"---\nproyecto: {i}\ndestino: {n['destino']}\ncreada: {n['creada']}\ncambiada: {n['cambiada']}\n---\n{n['texto']}", encoding="utf-8")
    actividad("version", f"{f.get('nombre', i)} restaurado a la versión del {s['ficha'].get('actualizado', v)}", str(_vdir(i)))
    guardar_version(i)


# ---------- MAPA.md: «lee mi DeskLens / mis anclas» (M1) ----------

def _rama(ruta):
    """Rama de git leyendo .git/HEAD (sin lanzar git: el mapa se rehace a menudo)."""
    try:
        h = (Path(ruta) / ".git" / "HEAD").read_text(encoding="utf-8").strip()
        return h.rsplit("/", 1)[-1] if h.startswith("ref:") else h[:8]
    except OSError:
        return ""


def escribir_mapa():
    """MAPA.md (para leer, también una IA) y MAPA.json (para programas) en historial/organizador/: cada proyecto con sus
    partes, la ruta ACTUAL de cada carpeta, su estado y sus conexiones. Sin credenciales ni IPs: solo nombres y rutas.
    Funciona aunque DeskLens esté cerrado (es un archivo). Se rehace tras cada cambio de ficha o de ancla."""
    if not ajustes()["mapa"]:
        return ""
    fs = fichas()
    estado = {"ok": "✓", "movida": "✓ (movida)", "papelera": "🗑 en la papelera", "eliminada": "✗ eliminada",
              "desconectado": "⚠ disco no conectado", "falta": "⚠ no encontrada"}
    ln = ["# Mapa de proyectos de DeskLens",
          f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')} · {len(fs)} proyecto(s). Lo mantiene DeskLens: no lo edites a mano.",
          "Solo lectura: no muevas, renombres ni borres los archivos `.desklens-ancla` (unen cada carpeta con su proyecto).", ""]
    for f in sorted(fs, key=lambda x: x["nombre"].lower()):
        tec = ", ".join(f.get("tecnologia", []))
        ln.append(f"## {f['nombre']}  ({f['estado']} · {f['avance']} %{' · ' + tec if tec else ''})")
        if f.get("descripcion"):
            ln.append(f["descripcion"])
        if f.get("nota"):
            ln.append(f"Nota del vault: [[{f['nota']}]]")
        for e in f.get("enlaces", []):
            ln.append(f"Enlace: {e['nombre']} → {e['url']}")
        abiertos = [x for x in f.get("pendientes", []) if not x.get("hecho")]
        if abiertos:
            ln.append(f"Pendientes ({len(abiertos)}):")
            ln += [f"- [ ] {x['texto'].splitlines()[0]}" for x in abiertos]
        ln += ["", "| Parte | Ruta actual | Estado |", "|---|---|---|"]
        for p in f["partes"]:
            for c in p["carpetas"]:
                extra = []
                if c["git"]:
                    extra.append(f"⎇ {_rama(c['ruta']) or 'git'}")
                otros = [x for x in c["proyectos"] if x != f["id"]]
                if otros:
                    extra.append("compartida con: " + ", ".join(otros))
                ln.append(f"| {TIPO_ICONO.get(p['tipo'], '📁')} {p['nombre']}{' · ' + c['etapa'] if c.get('etapa') else ''} | {c['ruta']} | "
                          f"{'🌍 remota' if c['estado'] == 'remota' else estado.get(c['estado'], c['estado'])}"
                          f"{' · ' + ' · '.join(extra) if extra else ''} |")
        nombres = {c["ancla"]: c["nombre"] for p in f["partes"] for c in p["carpetas"]}
        for k in f.get("conexiones") or []:
            ln.append(f"Conexión: {nombres.get(k.get('de'), k.get('de'))} «{k.get('etiqueta', '')}» {nombres.get(k.get('a'), k.get('a'))}")
        ln.append("")
    texto = "\n".join(ln)
    (DATA / "MAPA.md").write_text(texto, encoding="utf-8")
    escribir_json(DATA / "MAPA.json", [{"id": f["id"], "nombre": f["nombre"], "estado": f["estado"], "avance": f["avance"],
                                        "partes": [{"nombre": p["nombre"], "tipo": p["tipo"],
                                                    "carpetas": [{"ruta": c["ruta"], "estado": c["estado"]} for c in p["carpetas"]]}
                                                   for p in f["partes"]]} for f in fs])
    return str(DATA / "MAPA.md")


TIPO_ICONO = {"entornos": "🚦", "codigo": "💻", "material": "🎬", "web": "🌐", "respaldos": "🗄", "base_datos": "🛢", "documentos": "📄", "otro": "📁"}
_mapa_timer = [None]


MAPA_AUTO = [True]  # las pruebas lo apagan (escriben el mapa a mano)


def mapa_luego():
    """Rehace el mapa 2 s después del último cambio (varios cambios seguidos = una sola escritura)."""
    if not MAPA_AUTO[0]:
        return
    if _mapa_timer[0]:
        _mapa_timer[0].cancel()
    t = threading.Timer(2.0, _mapa_seguro)
    t.daemon = True
    _mapa_timer[0] = t
    t.start()


def _mapa_seguro():
    try:
        if escribir_mapa():
            actividad("mapa", "MAPA.md actualizado", str(DATA / "MAPA.md"))
    except Exception as e:  # noqa: BLE001 — el mapa nunca rompe nada
        actividad("mapa", f"No se pudo escribir MAPA.md: {e}", str(DATA / "MAPA.md"), "error")


# ---------- respaldo diario de historial/organizador ----------

def info_respaldo():
    d = leer_json(DATA / "respaldo.json", {})
    a = ajustes()
    letra = letra_de_serie(a["respaldo_disco"]) if a["respaldo_disco"] else ""
    return {"ultimo": d.get("ultimo", ""), "ruta": d.get("ruta", ""), "disco": a["respaldo_disco"], "letra": letra,
            "guardar": a["respaldo_guardar"]}


def respaldar():
    """Copia fichas, anclas, discos, ajustes, actividad y mapa al disco elegido: <disco>\\DeskLens-respaldo\\organizador\\
    <fecha>. Deja las últimas N copias. carpetas.db no se copia (son nombres de carpetas: se rehace recorriendo)."""
    a = ajustes()
    if not a["respaldo_disco"]:
        raise ValueError("Elige en ⚙ Ajustes › Proyectos el disco del respaldo")
    letra = letra_de_serie(a["respaldo_disco"])
    if not letra:
        actividad("respaldo", "Respaldo pospuesto: el disco elegido no está conectado", "", "aviso")
        raise ValueError("El disco del respaldo no está conectado")
    base = Path(letra) / "DeskLens-respaldo" / "organizador"
    dest = base / datetime.now().strftime("%Y-%m-%d")
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(DATA, dest, ignore=shutil.ignore_patterns("carpetas.db*", "*.tmp"))
    viejas = sorted(x for x in base.iterdir() if x.is_dir() and re.fullmatch(r"\d{4}-\d{2}-\d{2}", x.name))
    for x in viejas[:-max(1, a["respaldo_guardar"])]:
        shutil.rmtree(x, ignore_errors=True)
    tam = sum(p.stat().st_size for p in dest.rglob("*") if p.is_file())
    escribir_json(DATA / "respaldo.json", {"ultimo": datetime.now().isoformat(timespec="seconds"), "ruta": str(dest)})
    actividad("respaldo", f"Respaldo diario · {tam / 1e6:.1f} MB".replace(".", ","), str(dest))
    return info_respaldo()


def vigilante():
    """Hilo del organizador (lo arranca DeskLens): una vez al día, el respaldo (si hay disco elegido); al arrancar, el
    mapa. Duerme una hora entre vueltas."""
    time.sleep(20)  # que DeskLens arranque primero
    mapa_luego()
    while True:
        try:
            r = info_respaldo()
            if r["disco"] and r["ultimo"][:10] != datetime.now().date().isoformat() and r["letra"]:
                respaldar()
        except Exception as e:  # noqa: BLE001
            actividad("respaldo", f"El respaldo falló: {e}", "", "error")
        time.sleep(3600)


def abrir_datos(cual=""):
    """Abre en el Explorador la carpeta de datos del organizador o la del último respaldo."""
    ruta = info_respaldo()["ruta"] if cual == "respaldo" else str(DATA)
    if not ruta or not Path(ruta).exists():
        raise ValueError("Esa carpeta todavía no existe")
    subprocess.Popen(["explorer.exe", ruta] if WINDOWS else ["xdg-open", ruta])


def lanzar(programa, proyecto_id):
    """Botones de la tarjeta: VS Code o Claude en la carpeta de código del proyecto.
    Claude se abre con --add-dir de las demás partes (material, web…): ve el proyecto entero, no solo el código."""
    f = next((x for x in fichas() if x["id"] == proyecto_id), None)
    if not f:
        raise ValueError("No existe ese proyecto")
    vivas = [(p["tipo"], c["ruta"]) for p in f["partes"] for c in p["carpetas"] if c["estado"] in ("ok", "movida") and c.get("activa", True)]
    if not vivas:
        raise ValueError("Ninguna carpeta del proyecto está disponible")
    base = next((r for t, r in vivas if t == "codigo"), vivas[0][1])
    otras = [r for _, r in vivas if r != base]
    if programa == "vscode":
        exe = shutil.which("code")
        if not exe:
            raise ValueError("No encuentro VS Code (la orden «code» no está en el PATH)")
        subprocess.Popen([exe, base], cwd=base, creationflags=NO_WINDOW)
    elif programa == "claude":
        exe = shutil.which("claude")
        if not exe:
            raise ValueError("No encuentro Claude Code (la orden «claude» no está en el PATH)")
        args = [exe] + [x for r in otras for x in ("--add-dir", r)]
        if WINDOWS:  # ventana de consola propia: Claude es interactivo
            subprocess.Popen(["cmd.exe", "/k", subprocess.list2cmdline(args)], cwd=base, creationflags=0x00000010)
        else:
            subprocess.Popen(args, cwd=base, start_new_session=True)
    else:
        raise ValueError("Programa no válido")
    actividad("lanzar", f"{'VS Code' if programa == 'vscode' else 'Claude'} abierto en {f['nombre']}"
              + (f" (con {len(otras)} carpeta(s) más)" if programa == "claude" and otras else ""), base)
    return {"carpeta": base, "otras": otras}


# ---------- HTTP (lo llama el servidor de DeskLens) ----------

def get(ruta, q, proyectos_desklens=()):
    """GET /api/org/…  → (código, datos) o None si no es de este módulo."""
    if not ruta.startswith("/api/org/"):
        return None
    r = ruta[len("/api/org/"):]
    if r in ("carpeta", "peso"):  # ⓘ panel de información
        try:
            if r == "carpeta":
                return 200, info_carpeta(q.get("ruta", ""), q.get("peso", "1") != "0")
            if not dentro_de_proyecto(q.get("ruta", "")):
                return 403, {"error": "Esa carpeta no está dentro de un proyecto"}
            return 200, peso_carpeta(q.get("ruta", ""), q.get("iniciar", "1") != "0")
        except (ValueError, OSError) as e:
            return 400, {"error": str(e)}
    if r == "estado":
        fs = fichas()
        ya = {c["ruta"].lower() for f in fs for p in f["partes"] for c in p["carpetas"]}
        return 200, {"ajustes": ajustes(), "fichas": fs, "alertas": sum(f["avisos"] for f in fs),
                     "discos_activos": sum(1 for d in config_discos().values() if d.get("activo")),
                     "sin_convertir": [x for x in proyectos_desklens if x.lower() not in ya],
                     "recorrido": estado_recorrido(),
                     "quitados": len(list((DATA / "quitados").glob("*.json"))), "quitados_dir": str(DATA / "quitados")}
    if r == "discos":
        return 200, {"discos": discos()}
    if r == "alertas":
        return 200, {"alertas": alertas()}
    if r == "recorrido":
        return 200, {"recorrido": estado_recorrido()}
    if r == "relaciones":
        return 200, {"proyectos": relaciones(proyectos_desklens)}
    if r in ("analizar", "sugerencias", "buscar_carpetas"):  # ＋ Nuevo proyecto / ＋ Añadir carpetas
        try:
            if r == "buscar_carpetas":
                return 200, buscar_carpetas(q.get("en", ""), q.get("q", ""), q.get("archivos") == "1")
            if r == "analizar":
                return 200, analizar_ruta(q.get("ruta", ""))
            return 200, sugerencias(q.get("nombre", ""), [x for x in q.get("excluir", "").split("|") if x])
        except (ValueError, OSError) as e:
            return 400, {"error": str(e)}
    if r == "actividad":
        return 200, leer_actividad()
    if r == "quitados":
        return 200, {"quitados": quitados(), "carpeta": str(DATA / "quitados")}
    try:
        if r == "versiones":
            return 200, {"versiones": versiones(q.get("id", ""))[::-1], "commits": commits_proyecto(q.get("id", ""))}
        if r == "version":
            return 200, leer_version(q.get("id", ""), q.get("v", ""))
        if r == "notas":
            return 200, {"notas": notas(q.get("id", ""))}
    except (ValueError, OSError) as e:
        return 400, {"error": str(e)}
    if r == "ajustes":
        return 200, {**ajustes(), "respaldo": info_respaldo(), "datos": str(DATA), "mapa_ruta": str(DATA / "MAPA.md"),
                     "mapa_fecha": datetime.fromtimestamp((DATA / "MAPA.md").stat().st_mtime).isoformat(timespec="seconds") if (DATA / "MAPA.md").exists() else "",
                     "n_fichas": len(fichas_crudas()), "n_anclas": len(registro()), "n_quitados": len(list((DATA / "quitados").glob("*.json"))),
                     "discos": [{"serie": d["serie"], "letra": d["letra"], "nombre": d["nombre"], "conectado": d["conectado"], "activo": d["activo"]} for d in discos()]}
    return 404, {"error": "no existe"}


def post(ruta, datos):
    """POST /api/org/…  → (código, datos) o None si no es de este módulo."""
    if not ruta.startswith("/api/org/"):
        return None
    r = ruta[len("/api/org/"):]
    try:
        if r == "ficha/crear":
            f, av = crear_ficha(datos)
            return 200, {"ficha": f, "avisos": av}
        if r == "ficha/guardar":
            f, av = guardar_ficha(datos.get("id", ""), datos)
            return 200, {"ficha": f, "avisos": av}
        if r == "ficha/anadir":
            f, av = anadir_carpetas(datos.get("id", ""), datos.get("carpetas", []), datos.get("principal_ruta", ""), datos.get("carpetas_movidas"))
            return 200, {"ficha": f, "avisos": av}
        if r == "ficha/quitar_carpeta":
            return 200, {"ficha": quitar_carpeta(datos.get("id", ""), datos.get("ancla", ""))}
        if r == "ficha/mover_carpeta":
            return 200, {"ficha": mover_carpeta(datos.get("id", ""), datos.get("ancla", ""), datos.get("tipo", ""), datos.get("nombre", ""))}
        if r == "peso/parar":
            parar_peso(datos.get("ruta", ""))
            return 200, {}
        if r == "papelera":
            abrir_papelera()
            return 200, {}
        if r == "ficha/quitar":
            quitar_ficha(datos.get("id", ""))
            return 200, {}
        if r == "fichas/quitar":  # varios, desde las casillas de la vista Lista
            return 200, quitar_fichas(datos.get("ids", []), bool(datos.get("borrar_anclas")))
        if r == "quitados/recuperar":
            hechos, av = recuperar_quitados(datos.get("archivos", []))
            return 200, {"recuperados": hechos, "avisos": av}
        if r == "quitados/vaciar":
            return 200, {"borrados": vaciar_quitados(datos.get("archivos") or None)}
        if r == "fichas/crear":  # confirmar el flujo de arranque: varias fichas de una vez
            hechas, avisos = [], []
            for d in datos.get("fichas", []):
                f, av = crear_ficha(d)
                hechas.append(f)
                avisos.extend(av)
            return 200, {"fichas": hechas, "avisos": avisos}
        if r == "convertir":
            hechas, av = convertir_proyectos(datos.get("rutas", []))
            return 200, {"fichas": hechas, "avisos": av}
        if r == "disco":
            return 200, {"disco": guardar_disco(datos.get("serie", ""), datos)}
        if r == "recorrido/iniciar":
            series = datos.get("series") or [s for s, d in config_discos().items() if d.get("activo")]
            if not series:
                return 400, {"error": "Marca al menos un disco"}
            return 200, {"recorrido": iniciar_recorrido(series, datos.get("modo", "anclas"), datos.get("buscar") or ())}
        if r == "recorrido/detener":
            return 200, {"recorrido": detener_recorrido()}
        if r == "ajustes":
            return 200, guardar_ajustes(datos)
        if r == "version/nombre":
            if not str(datos.get("nombre", "")).strip():
                raise ValueError("La versión necesita un nombre")
            return 200, {"version": guardar_version(datos.get("id", ""), str(datos["nombre"]).strip())}
        if r == "version/restaurar":
            restaurar_version(datos.get("id", ""), datos.get("v", ""))
            return 200, {}
        if r == "nota/guardar":
            return 200, {"nota": guardar_nota(datos.get("proyecto", ""), datos.get("destino", ""), datos.get("texto", ""), datos.get("id", ""))}
        if r == "nota/borrar":
            borrar_nota(datos.get("proyecto", ""), datos.get("id", ""))
            return 200, {}
        if r == "respaldo/ahora":
            return 200, respaldar()
        if r == "abrir_datos":
            abrir_datos(datos.get("cual", ""))
            return 200, {}
        if r == "mapa":
            return 200, {"ruta": escribir_mapa()}
        if r == "lanzar":
            return 200, lanzar(datos.get("programa", ""), datos.get("id", ""))
        if r == "actividad/limpiar":
            with _act_lock:
                (DATA / "actividad.log").unlink(missing_ok=True)
            return 200, leer_actividad()
    except (ValueError, OSError) as e:
        return 400, {"error": str(e)}
    return 404, {"error": "no existe"}
