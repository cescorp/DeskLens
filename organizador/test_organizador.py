"""Pruebas del organizador de proyectos. Uso: python organizador/test_organizador.py
Trabaja en una carpeta temporal (datos y «disco» falsos): no toca historial/organizador ni los discos reales."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import organizador as org  # noqa: E402

tmp = Path(tempfile.mkdtemp(prefix="org-test-"))
org.configurar(tmp / "datos")
disco = tmp / "disco"


def carpeta(*partes, git=False, archivos=()):
    p = disco.joinpath(*partes)
    p.mkdir(parents=True, exist_ok=True)
    if git:
        (p / ".git").mkdir(exist_ok=True)
    for a in archivos:
        (p / a).write_text("x", encoding="utf-8")
    return p


def recorrer(modo, buscar=()):
    """Recorre la carpeta temporal como si fuera un disco (mismo código que con los discos reales)."""
    r = org.Recorrido([org.serie(disco)], modo, buscar)
    r.discos[0]["letra"] = str(disco)
    r.discos[0]["estado"] = "espera"
    r._correr()
    return r


try:
    # nombres, iconos y tipos
    assert org.normalizar("Videos - Material HomeShape") == "videosmaterialhomeshape"
    assert org.normalizar("home_shape") == org.normalizar("HomeShape") == "homeshape"
    assert org.slug("Curso bíblico") == "curso-biblico"
    assert org.icono_sugerido("Videos clases") == "🎬" and org.icono_sugerido("biblia") == "📚"
    assert org.icono_sugerido("cualquiera") == "📁" and org.icono_sugerido("x", git=True) == "💻"
    assert org.tipo_sugerido(r"C:\xampp\htdocs\hs") == "web"
    assert org.tipo_sugerido(r"G:\homeshape_calidad", True) == "respaldos"
    assert org.tipo_sugerido(r"H:\Videos - Material HomeShape") == "material"
    assert org.tipo_sugerido(r"G:\homeshape", True) == "codigo"

    # exclusiones: * por tramo, sin mayúsculas
    ex = org.Exclusiones(["Windows", "Users\\*\\AppData", "Users\\*\\.*"])
    assert ex.salta(["windows"]) and ex.salta(["users", "cesar", "appdata"]) and ex.salta(["users", "cesar", ".cache"])
    assert not ex.salta(["users", "cesar", "documents"]) and not ex.salta(["windowsapps"])

    # ajustes: solo claves conocidas y del tipo correcto
    a = org.guardar_ajustes({"historial_mb": 300, "raro": 1, "ignorar_git": "si", "indice": {"material": "no", "x": "todo"}})
    assert a["historial_mb"] == 300 and "raro" not in a and a["ignorar_git"] is True and a["indice"]["material"] == "no"
    org.guardar_ajustes({"indice": {"material": "nombres_pdf"}})

    # árbol de prueba
    hs = carpeta("homeshape", git=True, archivos=["artisan"])
    vid = carpeta("Videos - Material HomeShape", archivos=["clase1.mp4"])
    cal = carpeta("homeshape_calidad", git=True)
    web = carpeta("xampp", "htdocs", "homeshape")
    carpeta("homeshape", "resources", "homeshape")       # dentro de la semilla: no es otra parte
    carpeta("node_modules", "homeshape-lib")              # se salta siempre
    carpeta("biblia", archivos=["genesis.pdf"])
    carpeta("app", archivos=["package.json"])             # nombre genérico: no es semilla
    carpeta("Webs", "rsbiblica", "NOTAS", "enviar_correos", "mailer2", archivos=["composer.json"])  # librería dentro de una web
    carpeta("Webs", "rsbiblica", "_files", "_biblia")    # dentro de otro proyecto (rsbiblica): no es parte de «biblia»
    carpeta("biblia", git=True)                           # «biblia» es proyecto (git)
    carpeta("biblia_web", git=True)                       # semilla absorbida por «biblia»

    # anclas
    i, avisos = org.poner_ancla(hs)
    assert org.ID_RE.fullmatch(i) and org.leer_ancla(hs) == i and avisos == []
    assert org.poner_ancla(hs)[0] == i, "poner el ancla dos veces devuelve la misma"
    assert json.loads((hs / org.ANCLA).read_text(encoding="utf-8")).keys() == {"id", "creada"}
    assert org.registro()[i]["ruta"] == str(hs)
    excl = (hs / ".git" / "info" / "exclude")
    if not shutil.which("git"):  # sin git: .git como carpeta
        assert org.ANCLA in excl.read_text(encoding="utf-8")
    j, avisos = org.poner_ancla(web)
    assert avisos and "web" in avisos[0], "al anclar en htdocs se avisa"
    try:
        org.poner_ancla(Path(disco.anchor))
        raise AssertionError("un disco entero no se ancla")
    except ValueError:
        pass
    (vid / "suelto.txt").write_text("x", encoding="utf-8")
    k, _ = org.poner_ancla(vid / "suelto.txt")
    assert org.leer_ancla(vid) == k, "un archivo suelto se ancla por su carpeta"

    # git real: el ancla va a .git/info/exclude y git status no la ve
    if shutil.which("git"):
        repo = carpeta("repo-real")
        subprocess.run(["git", "init", "-q", str(repo)], check=True)
        org.poner_ancla(repo)
        st = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=repo, capture_output=True, text=True).stdout
        assert org.ANCLA not in st, st
        org.excluir_en_git(repo)
        assert (repo / ".git" / "info" / "exclude").read_text(encoding="utf-8").count(org.ANCLA) == 1, "no se repite"

    # recorrido de arranque + relaciones por nombre
    r = recorrer("arranque")
    assert r.discos[0]["estado"] == "listo" and r.discos[0]["carpetas"] > 5
    assert {i, j, k} <= set(r.encontradas) and set(r.encontradas) <= set(org.registro()), r.encontradas
    props = org.relaciones()
    hsp = [p for p in props if p["clave"] == "homeshape"]
    assert len(hsp) == 1, [p["clave"] for p in props]
    rutas = {c["ruta"]: c for c in hsp[0]["carpetas"]}
    assert str(hs) in rutas and str(vid) in rutas and str(cal) in rutas and str(web) in rutas, list(rutas)
    assert str(hs / "resources" / "homeshape") not in rutas and not any("node_modules" in x for x in rutas)
    assert rutas[str(cal)]["tipo"] == "respaldos" and rutas[str(vid)]["tipo"] == "material" and rutas[str(web)]["tipo"] == "web"
    assert rutas[str(hs)]["anclada"] and rutas[str(vid)]["icono"] == "🎬"
    assert not any(p["clave"] == "app" for p in props), "nombres genéricos no son proyectos"
    assert not any(p["clave"] == "homeshapecalidad" for p in props), "homeshape_calidad es parte de homeshape"
    assert any(p["clave"] == "rsbiblica" for p in props), "cada hija de Webs/ es un proyecto"
    assert not any(p["clave"] == "mailer2" for p in props), "una librería dentro de un proyecto no es otro proyecto"
    assert hsp[0]["git"] and not [p for p in props if p["clave"] == "rsbiblica"][0]["git"]
    bib = {c["ruta"] for c in next(p for p in props if p["clave"] == "biblia")["carpetas"]}
    assert str(disco / "biblia_web") in bib and not any("rsbiblica" in x for x in bib), bib

    # fichas
    f, av = org.crear_ficha({"nombre": "homeshape", "estado": "activo", "avance": 90, "tecnologia": ["Laravel"],
                             "partes": [{"nombre": "Código", "tipo": "codigo", "carpetas": [{"ruta": str(hs)}]},
                                        {"nombre": "Material", "tipo": "material", "carpetas": [{"ruta": str(vid), "icono": "🎬"}]},
                                        {"nombre": "Respaldos", "tipo": "respaldos", "carpetas": [{"ruta": str(cal)}]}]})
    assert f["id"] == "homeshape" and f["partes"][0]["carpetas"][0]["ancla"] == i
    assert "ruta" not in json.dumps(json.loads((tmp / "datos" / "proyectos" / "homeshape.json").read_text(encoding="utf-8"))), "la ficha no guarda rutas"
    f2, _ = org.crear_ficha({"nombre": "homeshape", "partes": []})
    assert f2["id"] == "homeshape-2"
    org.crear_ficha({"nombre": "Curso bíblico", "partes": [{"tipo": "material", "carpetas": [{"ruta": str(vid)}]}]})
    todas = {x["id"]: x for x in org.fichas()}
    c = todas["homeshape"]["partes"][1]["carpetas"][0]
    assert c["ruta"] == str(vid) and c["estado"] == "ok" and c["proyectos"] == ["curso-biblico", "homeshape"], c
    assert todas["homeshape"]["partes"][0]["carpetas"][0]["git"] is True
    for malo in ({"estado": "raro"}, {"avance": "x"}, {"partes": [{"tipo": "raro"}]}):
        try:
            org.crear_ficha({"nombre": "x", **malo})
            raise AssertionError(f"debía fallar: {malo}")
        except ValueError:
            pass
    g, _ = org.guardar_ficha("homeshape", {"avance": 95})
    assert g["avance"] == 95 and g["tecnologia"] == ["Laravel"] and len(g["partes"]) == 3

    # mover dentro del mismo disco: se encuentra por el ID de NTFS sin recorrer
    nuevo = disco / "archivo" / "Videos movidos"
    nuevo.parent.mkdir()
    os.rename(vid, nuevo)
    est, ruta = org.ubicar(k)
    if org.WINDOWS:
        assert (est, ruta) == ("movida", str(nuevo)), (est, ruta)
        assert org.registro()[k]["ruta"] == str(nuevo)
    os.rename(nuevo, vid)
    org._registrar(k, vid)

    # copiar a otro sitio y borrar el original (como pasar a otro disco): no está → alerta → el recorrido la encuentra
    otro = disco / "otro disco" / "Material"
    shutil.copytree(cal, otro)
    shutil.rmtree(cal)
    al = org.alertas()
    assert [x["parte"] for x in al] == ["Respaldos"] and al[0]["estado"] == "falta", al
    r = recorrer("anclas", [x["id"] for x in al])
    assert r.encontradas == {al[0]["id"]: str(otro)}, r.encontradas
    assert org.alertas() == []

    # dos carpetas con la misma ancla (una copia): el recorrido las avisa
    shutil.copytree(otro, disco / "copia de Material")
    r = recorrer("arranque")
    assert al[0]["id"] in r.copias and len(r.copias[al[0]["id"]]) == 2

    # enviada a la papelera: no es «movida»; se avisa y se guarda la ruta de antes. Restaurada: vuelve sola. Vaciada: eliminada
    if org.WINDOWS:
        bot = carpeta("bot-whatsapp")
        fb, _ = org.crear_ficha({"nombre": "bot", "partes": [{"tipo": "otro", "carpetas": [{"ruta": str(bot)}]}]})
        ib = fb["partes"][0]["carpetas"][0]["ancla"]
        papelera = disco / "$Recycle.Bin" / "S-1-5-21" / "$R4V4B3B"
        papelera.parent.mkdir(parents=True)
        os.rename(bot, papelera)
        assert next(c for f in org.fichas() if f["id"] == "bot" for p in f["partes"] for c in p["carpetas"])["eliminada"], "la primera vez ya trae la fecha"
        assert org.ubicar(ib) == ("papelera", str(bot)), org.ubicar(ib)
        d = org.registro()[ib]
        assert d["ruta"] == str(bot) and d["papelera"] == str(papelera) and d["eliminada"]
        x = next(c for f in org.fichas() if f["id"] == "bot" for p in f["partes"] for c in p["carpetas"])
        assert x["estado"] == "papelera" and x["nombre"] == "bot-whatsapp" and x["eliminada"]
        assert [a["estado"] for a in org.alertas() if a["proyecto_id"] == "bot"] == ["papelera"]
        org.ubicar(ib)
        assert sum("papelera" in ln["texto"] for ln in org.leer_actividad()["lineas"]) == 1, "se avisa una sola vez"
        os.rename(papelera, bot)  # restaurar
        assert org.ubicar(ib) == ("ok", str(bot)) and "papelera" not in org.registro()[ib]
        os.rename(bot, papelera)
        org.ubicar(ib)
        shutil.rmtree(papelera)  # vaciar la papelera
        assert org.ubicar(ib) == ("eliminada", str(bot))
        reg = org.registro()  # registro antiguo (de antes de esta corrección) que apuntaba dentro de la papelera
        reg[ib].update({"ruta": str(papelera)}); [reg[ib].pop(k, None) for k in ("papelera", "eliminada", "borrada")]
        org.escribir_json(org.DATA / "anclas.json", reg)
        assert org.ubicar(ib)[0] in ("papelera", "eliminada") and org.registro()[ib].get("papelera"), "ya no cuenta como movida"
        org.quitar_carpeta("bot", ib)
        assert not next(f for f in org.fichas() if f["id"] == "bot")["partes"][0]["carpetas"]

    # carpeta cuyo nombre termina en espacio (Windows lo «normaliza»): se ancla igual; una que no existe se salta con aviso
    if org.WINDOWS:
        rara = disco / "plan de la biblia corto "
        os.mkdir(org.larga(rara))
        f3, av = org.crear_ficha({"nombre": "Raras", "partes": [{"tipo": "material", "carpetas": [{"ruta": str(rara)}, {"ruta": str(disco / "no-existe")}]}]})
        assert len(f3["partes"][0]["carpetas"]) == 1 and org.leer_ancla(str(rara)), f3
        assert len(av) == 1 and "no-existe" in av[0], av
        assert org.ubicar(f3["partes"][0]["carpetas"][0]["ancla"]) == ("ok", str(rara))
        assert org.post("/api/org/fichas/crear", {"fichas": [{"nombre": "x", "partes": [{"tipo": "otro", "carpetas": [{"ruta": str(disco / "nada")}]}]}]})[0] == 200
        shutil.rmtree(org.larga(rara))

    # convertir los proyectos actuales de DeskLens
    viejo = carpeta("ProyectoViejo", git=True)
    hechas, _ = org.convertir_proyectos([str(viejo), str(hs)])
    assert [h["nombre"] for h in hechas] == ["ProyectoViejo"], "lo que ya está en una ficha no se repite"

    # quitar del organizador: no borra nada del disco
    org.quitar_ficha("homeshape-2")
    assert not (tmp / "datos" / "proyectos" / "homeshape-2.json").exists() and list((tmp / "datos" / "quitados").glob("homeshape-2-*.json"))

    # discos: exclusiones por disco y restaurar
    s = org.serie(disco)
    d = org.guardar_disco(s, {"activo": True, "propias": ["\\Users\\Cesar\\Videos\\Capturas\\"], "quitadas": ["PerfLogs"]})
    cfg = org.config_discos()[s]
    assert cfg["activo"] and cfg["propias"] == ["Users\\Cesar\\Videos\\Capturas"] and cfg["quitadas"] == ["PerfLogs"]
    org.guardar_disco(s, {"restaurar": True})
    assert org.config_discos()[s]["quitadas"] == []
    try:
        org.guardar_disco("../x", {})
        raise AssertionError("serie no válida")
    except ValueError:
        pass
    assert any(x["serie"] == s for x in org.discos())

    # HTTP
    assert org.get("/api/otra", {}) is None and org.post("/api/otra", {}) is None
    code, est = org.get("/api/org/estado", {}, [str(hs), str(disco / "sin-ficha")])
    assert code == 200 and est["sin_convertir"] == [str(disco / "sin-ficha")], est["sin_convertir"]
    assert org.post("/api/org/ficha/guardar", {"id": "../../x"})[0] == 400
    assert org.post("/api/org/ficha/crear", {"nombre": "y", "estado": "mal"})[0] == 400
    act = org.leer_actividad()
    assert act["lineas"] and act["lineas"][0]["t"] >= act["lineas"][-1]["t"]
    assert any(x["tipo"] == "ancla" for x in act["lineas"])
    print("OK: todas las pruebas del organizador pasan")
finally:
    shutil.rmtree(tmp, ignore_errors=True)
