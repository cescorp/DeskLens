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


TIPOS = ["codigo", "material", "web", "respaldos", "base_datos", "documentos", "otro"]
ESTADOS = ["activo", "pausado", "terminado", "archivo"]
INDICE = ["todo", "nombres_pdf", "nombres", "no"]

AJUSTES_BASE = {
    "encendido": True,
    "ignorar_git": True,        # .desklens-ancla en .git/info/exclude (solo este PC)
    "avisar_web": True,         # avisar al anclar una carpeta servida por la web (htdocs…)
    "indice": {"codigo": "todo", "web": "todo", "documentos": "todo", "material": "nombres_pdf",
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
TIPO_PALABRAS = [(("backup", "respaldo", "copia", "bak", "calidad", "old", "antiguo"), "respaldos"),
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
            buscar = [x["id"] for x in alertas() if x["estado"] == "falta"]  # en la papelera o sin disco: no se busca
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
            carpetas.append({"ruta": s[0], "nombre": s[1], "tipo": tipo_sugerido(s[0], s[3] in ("git", "codigo")), "semilla": True})
        propias = {x.lower() for x in semis}
        for ruta, nombre, marca in hall:
            if ruta in semis or _dentro(ruta, tomadas) or en_otro(ruta, propias):
                continue
            tomadas.append(ruta)
            carpetas.append({"ruta": ruta, "nombre": nombre, "tipo": tipo_sugerido(ruta, bool(marca)), "semilla": False})
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


def _limpiar(datos, previa=None):
    """Valida y completa una ficha (los campos calculados no se guardan)."""
    f = dict(previa or {})
    hoy = datetime.now().date().isoformat()
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
    for k in ("conexiones", "cajas", "posiciones"):  # vistas Flujo y Red (Fase 1b): se guardan tal cual
        if k in datos or k in f:
            f[k] = datos.get(k, f.get(k))
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
        escribir_json(_ficha_path(i), f)
        actividad("ficha", f"Ficha creada: {f['nombre']}", str(_ficha_path(i)))
        mapa_luego()
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
        mapa_luego()
        return f, avisos


def quitar_ficha(i):
    """Quita el proyecto del organizador. No borra nada del disco: las anclas se quedan donde están."""
    with _fichas_lock:
        p = _ficha_path(i)
        f = leer_json(p, {})
        if not p.exists():
            raise ValueError("No existe ese proyecto")
        papelera = DATA / "quitados" / f"{i}-{int(time.time())}.json"
        papelera.parent.mkdir(parents=True, exist_ok=True)
        os.replace(p, papelera)  # se puede recuperar a mano
        actividad("ficha", f"Proyecto quitado del organizador: {f.get('nombre', i)} (copia en quitados/)", str(papelera))
        mapa_luego()


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
        ids = {c["ancla"] for f in fichas_crudas() for p in f.get("partes", []) for c in p.get("carpetas", [])}
        _permitidas.update(marca=marca, rutas=[Path(reg[i]["ruta"]).resolve() for i in ids if i in reg] + [DATA.resolve()])
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
    mapa_luego()
    return f


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
        ln += ["", "| Parte | Ruta actual | Estado |", "|---|---|---|"]
        for p in f["partes"]:
            for c in p["carpetas"]:
                extra = []
                if c["git"]:
                    extra.append(f"⎇ {_rama(c['ruta']) or 'git'}")
                otros = [x for x in c["proyectos"] if x != f["id"]]
                if otros:
                    extra.append("compartida con: " + ", ".join(otros))
                ln.append(f"| {TIPO_ICONO.get(p['tipo'], '📁')} {p['nombre']} | {c['ruta']} | {estado.get(c['estado'], c['estado'])}"
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


TIPO_ICONO = {"codigo": "💻", "material": "🎬", "web": "🌐", "respaldos": "🗄", "base_datos": "🛢", "documentos": "📄", "otro": "📁"}
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
    if r == "estado":
        fs = fichas()
        ya = {c["ruta"].lower() for f in fs for p in f["partes"] for c in p["carpetas"]}
        return 200, {"ajustes": ajustes(), "fichas": fs, "alertas": sum(f["avisos"] for f in fs),
                     "discos_activos": sum(1 for d in config_discos().values() if d.get("activo")),
                     "sin_convertir": [x for x in proyectos_desklens if x.lower() not in ya],
                     "recorrido": estado_recorrido()}
    if r == "discos":
        return 200, {"discos": discos()}
    if r == "alertas":
        return 200, {"alertas": alertas()}
    if r == "recorrido":
        return 200, {"recorrido": estado_recorrido()}
    if r == "relaciones":
        return 200, {"proyectos": relaciones(proyectos_desklens)}
    if r == "actividad":
        return 200, leer_actividad()
    if r == "ajustes":
        return 200, {**ajustes(), "respaldo": info_respaldo(), "datos": str(DATA), "mapa_ruta": str(DATA / "MAPA.md"),
                     "mapa_fecha": datetime.fromtimestamp((DATA / "MAPA.md").stat().st_mtime).isoformat(timespec="seconds") if (DATA / "MAPA.md").exists() else "",
                     "n_fichas": len(fichas_crudas()), "n_anclas": len(registro()),
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
        if r == "ficha/quitar_carpeta":
            return 200, {"ficha": quitar_carpeta(datos.get("id", ""), datos.get("ancla", ""))}
        if r == "papelera":
            abrir_papelera()
            return 200, {}
        if r == "ficha/quitar":
            quitar_ficha(datos.get("id", ""))
            return 200, {}
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
