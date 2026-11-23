"""Pruebas del organizador de proyectos. Uso: python organizador/test_organizador.py
Trabaja en una carpeta temporal (datos y «disco» falsos): no toca historial/organizador ni los discos reales."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import organizador as org  # noqa: E402

tmp = Path(tempfile.mkdtemp(prefix="org-test-"))
org.configurar(tmp / "datos")
org.MAPA_AUTO[0] = False  # el mapa se escribe a mano en la prueba
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
    assert org.tipo_sugerido(r"G:\homeshape_calidad", True) == "entornos" and org.tipo_sugerido(r"G:\homeshape-respaldos") == "respaldos"
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
    assert rutas[str(cal)]["tipo"] == "entornos" and rutas[str(cal)]["etapa"] == "Calidad" and rutas[str(vid)]["tipo"] == "material" and rutas[str(web)]["tipo"] == "web"
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

    # índice por tipo de parte: respaldos nunca; material con su modo; una carpeta en varios proyectos, el modo que más lee
    ri = dict(org.rutas_indice())
    assert ri[str(hs)] == "todo" and ri[str(vid)] == "nombres_pdf" and str(otro) not in ri, ri
    org.guardar_ajustes({"indice": {"material": "nombres"}})
    assert dict(org.rutas_indice())[str(vid)] == "nombres"
    org.guardar_ajustes({"indice": {"material": "nombres_pdf"}, "historial_dias": 9999})
    assert org.ajustes()["historial_dias"] == 365, "los números se quedan en su rango"

    # MAPA.md: proyectos, partes y rutas actuales (para «lee mis anclas»)
    ruta_mapa = org.escribir_mapa()
    mapa = Path(ruta_mapa).read_text(encoding="utf-8")
    assert "## homeshape" in mapa and str(vid) in mapa and "compartida con: curso-biblico" in mapa, mapa[:600]
    assert json.loads((tmp / "datos" / "MAPA.json").read_text(encoding="utf-8"))[0]["partes"]
    org.guardar_ajustes({"mapa": False})
    assert org.escribir_mapa() == ""
    org.guardar_ajustes({"mapa": True})

    # respaldo diario: copia los datos (sin carpetas.db) y deja las últimas N
    destino = tmp / "disco-respaldo"
    destino.mkdir()
    real = org.letra_de_serie
    org.letra_de_serie = lambda s: str(destino) if s == "ABCD1234" else real(s)
    try:
        try:
            org.respaldar()
            raise AssertionError("sin disco elegido no hay respaldo")
        except ValueError:
            pass
        org.guardar_ajustes({"respaldo_disco": "ABCD1234", "respaldo_guardar": 2})
        for viejo in ("2026-01-01", "2026-01-02", "2026-01-03"):
            (destino / "DeskLens-respaldo" / "organizador" / viejo).mkdir(parents=True)
        info = org.respaldar()
        copias = sorted(x.name for x in (destino / "DeskLens-respaldo" / "organizador").iterdir())
        assert len(copias) == 2 and copias[-1] == info["ultimo"][:10], copias
        hoy = destino / "DeskLens-respaldo" / "organizador" / copias[-1]
        assert (hoy / "anclas.json").exists() and (hoy / "proyectos").is_dir() and not (hoy / "carpetas.db").exists()
        try:
            org.guardar_ajustes({"respaldo_disco": "../x"})
            raise AssertionError("disco no válido")
        except ValueError:
            pass
    finally:
        org.letra_de_serie = real
        org.guardar_ajustes({"respaldo_disco": ""})

    # 🚦 Entornos: etapas en orden, carpeta anclada o remota (VPS)
    assert org.tipo_sugerido(r"G:\homeshape_pruebas") == "entornos" and org.etapa_sugerida("vps_homeshape") == "Producción"
    pr = carpeta("homeshape_pruebas")
    fe, _ = org.crear_ficha({"nombre": "Despliegue", "partes": [{"nombre": "Entornos", "tipo": "entornos", "carpetas": [
        {"ruta": str(pr)}, {"remota": {"nombre": "VPS", "url": "https://homeshape.app"}, "etapa": "Producción"}]}]})
    cs = fe["partes"][0]["carpetas"]
    assert cs[0]["etapa"] == "Pruebas" and cs[1]["ancla"].startswith("remota:") and cs[1]["remota"]["url"] == "https://homeshape.app"
    x = next(f for f in org.fichas() if f["id"] == "despliegue")["partes"][0]["carpetas"]
    assert x[1]["estado"] == "remota" and x[1]["nombre"] == "VPS" and x[1]["ruta"] == "https://homeshape.app"
    assert not any(a["proyecto_id"] == "despliegue" for a in org.alertas()), "una etapa remota no es «no encontrada»"
    g, _ = org.guardar_ficha("despliegue", {"partes": [{"nombre": "Entornos", "tipo": "entornos", "carpetas": [dict(cs[1]), dict(cs[0])]}]})
    assert [c["etapa"] for c in g["partes"][0]["carpetas"]] == ["Producción", "Pruebas"], "el orden es el que se guarda"
    try:
        org.crear_ficha({"nombre": "x", "partes": [{"tipo": "entornos", "carpetas": [{"remota": {"nombre": ""}}]}]})
        raise AssertionError("una etapa remota necesita nombre")
    except ValueError:
        pass
    assert "Producción" in Path(org.escribir_mapa()).read_text(encoding="utf-8")
    # «Mover a» (clic derecho): de Respaldos a Entornos toma la etapa por el nombre; la parte vacía se quita
    cal = carpeta("homeshape_calidad")
    org.guardar_ficha("despliegue", {"partes": [{"nombre": "Entornos", "tipo": "entornos", "carpetas": [dict(cs[0]), dict(cs[1])]},
                                                {"nombre": "Respaldos", "tipo": "respaldos", "carpetas": [{"ruta": str(cal)}]}]})
    ac = org.registro_ancla(cal) if hasattr(org, "registro_ancla") else next(i for i, r in org.registro().items() if Path(r["ruta"]) == cal)
    m = org.mover_carpeta("despliegue", ac, "entornos", "Entornos")
    assert [p["tipo"] for p in m["partes"]] == ["entornos"] and m["partes"][0]["carpetas"][1] == {"ancla": ac, "activa": True, "etapa": "Calidad"}, m  # entre Pruebas y la VPS
    m = org.mover_carpeta("despliegue", ac, "material", "Material")
    assert m["partes"][1]["nombre"] == "Material" and "etapa" not in m["partes"][1]["carpetas"][0]
    for malo in ((cs[1]["ancla"], "material"), (ac, "nada"), ("ffffffffffff", "codigo")):
        try:
            org.mover_carpeta("despliegue", *malo)
            raise AssertionError(malo)
        except ValueError:
            pass
    # ⓘ panel: datos y peso de una carpeta del proyecto (en segundo plano), con el peso de cada hijo; fuera de proyectos, no
    (cal / "app").mkdir()
    (cal / "app" / "a.bin").write_bytes(b"x" * 3000)
    (cal / "léeme.txt").write_bytes(b"y" * 500)
    org.mover_carpeta("despliegue", ac, "entornos")
    i = org.info_carpeta(str(cal))
    assert i["nombre"] == "homeshape_calidad" and i["atributos"] and i["peso"]["estado"] in ("calculando", "listo")
    for _ in range(100):
        pz = org.peso_carpeta(str(cal))
        if pz["estado"] == "listo":
            break
        time.sleep(0.05)
    assert pz["bytes"] == 3500 and pz["archivos"] == 2 and pz["carpetas"] == 1 and pz["hijos"]["app"] == 3000, pz
    assert org.dentro_de_proyecto(str(cal / "app")) and not org.dentro_de_proyecto(str(cal.parent))
    try:
        org.info_carpeta(str(cal.parent))
        raise AssertionError("fuera de proyectos")
    except ValueError:
        pass
    assert org.get("/api/org/peso", {"ruta": str(cal.parent)})[0] == 403
    org.quitar_ficha("despliegue")

    # ★ carpeta principal: por defecto la de Código con git, luego cualquiera con git, luego la de Código; elegible a mano.
    # El proyecto se llama como ella mientras no le pongas otro nombre.
    pa, pb, pc = carpeta("pp_material"), carpeta("pp_codigo"), carpeta("pp_pruebas")
    fp, _ = org.crear_ficha({"nombre": "pp_codigo", "partes": [{"tipo": "material", "carpetas": [{"ruta": str(pa)}]},
                                                               {"tipo": "codigo", "carpetas": [{"ruta": str(pb)}]},
                                                               {"tipo": "entornos", "carpetas": [{"ruta": str(pc)}]}]})
    anc = {Path(org.registro()[c["ancla"]]["ruta"]).name: c["ancla"] for p in fp["partes"] for c in p["carpetas"]}
    ver = lambda: next(f for f in org.fichas() if f["id"] == fp["id"])
    assert fp.get("nombre_sigue") and ver()["principal"] == anc["pp_codigo"] and not ver()["principal_elegida"]
    (pc / ".git").mkdir()
    assert ver()["principal"] == anc["pp_pruebas"], "sin git en Código: la que tiene git"
    org.guardar_ficha(fp["id"], {"principal": anc["pp_material"]})
    assert ver()["principal"] == anc["pp_material"] and ver()["principal_elegida"] and ver()["nombre"] == "pp_material"
    org.guardar_ficha(fp["id"], {"nombre": "Mi proyecto"})
    assert ver()["nombre"] == "Mi proyecto" and not org.leer_json(org._ficha_path(fp["id"]), {}).get("nombre_sigue")
    org.quitar_carpeta(fp["id"], anc["pp_material"])
    assert ver()["principal"] == anc["pp_pruebas"], "si la elegida ya no está, vuelve a la de por defecto"
    v = org.versiones(fp["id"])[-1]["v"]
    assert org.leer_version(fp["id"], v)["ficha"]["principal"] == anc["pp_pruebas"]
    org.quitar_ficha(fp["id"])

    # Fase 1b · conectores, cajas y posiciones: se validan y se guardan en la ficha
    g, _ = org.guardar_ficha("homeshape", {"conexiones": [{"id": "c1", "de": k, "a": "parte:2", "etiqueta": "se publica en", "dir": "xx"}, {"de": ""}],
                                           "cajas": [{"id": "b1", "texto": "Grabar → Editar → Subir"}], "posiciones": {"flujo": {"p": {"x": 1.234, "y": "5"}}, "raro": {}}})
    assert g["conexiones"] == [{"id": "c1", "de": k, "a": "parte:2", "etiqueta": "se publica en", "color": "", "dir": "→"}], g["conexiones"]
    assert g["cajas"][0]["texto"].startswith("Grabar") and g["posiciones"] == {"flujo": {"p": {"x": 1.2, "y": 5.0}}, "red": {}}

    # historial de la estructura: cada cambio es un punto; los de 5 minutos seguidos se juntan; con nombre, aparte
    vs = org.versiones("homeshape")
    assert vs and vs[-1]["auto"], vs
    n = len(vs)
    org.guardar_ficha("homeshape", {"avance": 50})
    assert len(org.versiones("homeshape")) == n, "dentro de 5 min se junta con el anterior"
    org.guardar_version("homeshape", "v3 · antes de reorganizar")
    org.guardar_ficha("homeshape", {"avance": 51})
    vs = org.versiones("homeshape")
    assert [x["auto"] for x in vs[-2:]] == [False, True] and vs[-2]["nombre"] == "v3 · antes de reorganizar"
    assert org.guardar_version("homeshape")["v"] == vs[-1]["v"], "sin cambios no crea otro punto"
    v3 = vs[-2]["v"]
    assert org.leer_version("homeshape", v3)["ficha"]["avance"] == 50 and k in org.leer_version("homeshape", v3)["anclas"]

    # notas en nodos y conectores: Markdown en notas/, entran al historial
    nt = org.guardar_nota("homeshape", "nodo:" + k, "**Lección 4** usar [[génesis.pdf]]\n- [ ] Revisar RVR")
    assert (tmp / "datos" / "notas" / f"{nt['id']}.md").read_text(encoding="utf-8").startswith("---\nproyecto: homeshape")
    org.guardar_nota("homeshape", "conector:c1", "usa el material")
    assert [x["destino"] for x in org.notas("homeshape")] == ["conector:c1", "nodo:" + k] or len(org.notas("homeshape")) == 2
    org.guardar_nota("homeshape", "nodo:" + k, "cambiada", nt["id"])
    assert next(x for x in org.notas("homeshape") if x["id"] == nt["id"])["texto"] == "cambiada"
    for malo in (("../x", "proyecto"), ("homeshape", "nodo:../../x")):
        try:
            org.guardar_nota(malo[0], malo[1], "x")
            raise AssertionError(f"debía fallar: {malo}")
        except ValueError:
            pass
    org.borrar_nota("homeshape", nt["id"])
    assert len(org.notas("homeshape")) == 1

    # restaurar una versión: vuelve la ficha y sus notas; la actual queda guardada como versión con nombre
    org.restaurar_version("homeshape", v3)
    assert org.leer_json(org._ficha_path("homeshape"), {})["avance"] == 50 and org.notas("homeshape") == []
    assert any(x["nombre"].startswith("antes de restaurar") for x in org.versiones("homeshape"))

    # commits del código como marcas en la línea de tiempo (solo si hay git)
    if shutil.which("git"):
        subprocess.run(["git", "-C", str(hs), "init", "-q"], check=True)
        (hs / "a.txt").write_text("a", encoding="utf-8")
        subprocess.run(["git", "-C", str(hs), "-c", "user.name=t", "-c", "user.email=t@t", "add", "a.txt"], check=True)
        subprocess.run(["git", "-C", str(hs), "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "primero"], check=True)
        cs = org.commits_proyecto("homeshape")
        assert cs and cs[0]["titulo"] == "primero" and cs[0]["v"], cs
    code, r = org.get("/api/org/versiones", {"id": "homeshape"})
    assert code == 200 and r["versiones"][0]["fecha"] >= r["versiones"][-1]["fecha"]
    assert org.get("/api/org/version", {"id": "homeshape", "v": "nada"})[0] == 400

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

    # ＋ Nuevo proyecto a mano: analizar una ruta, sugerencias por nombre y añadir carpetas y archivos
    a = org.analizar_ruta(str(hs))
    assert a["existe"] and a["dir"] and a["git"] and a["tipo"] == "codigo" and any(x["id"] == "homeshape" for x in a["proyectos"]), a
    assert org.analizar_ruta(str(disco / "no-existe"))["existe"] is False
    assert org.analizar_ruta(str(hs / "resources"))["dentro_de"], "cuelga de una carpeta de otro proyecto"
    assert org.analizar_ruta(str(disco))["contiene"], "contiene carpetas de proyectos"
    assert org.analizar_ruta(str(cal))["tipo"] == "entornos" and org.analizar_ruta(str(cal))["etapa"] == "Calidad"
    try:
        org.analizar_ruta("")
        raise AssertionError("ruta vacía")
    except ValueError:
        pass
    sg = org.sugerencias("homeshape", [str(hs)])
    rutas_sg = [x["ruta"] for x in sg["carpetas"]]
    assert str(hs) not in rutas_sg and str(vid) in rutas_sg and not any(r.startswith(str(hs) + os.sep) for r in rutas_sg), rutas_sg
    assert org.sugerencias("app")["aviso"] and not org.sugerencias("ab")["carpetas"]
    nuevo = carpeta("nuevo-proy", git=True)
    doc = carpeta("docs-nuevo", archivos=["requisitos.pdf"])
    f, av = org.crear_ficha({"nombre": "nuevo-proy", "principal_ruta": str(nuevo), "partes": [
        {"tipo": "codigo", "carpetas": [{"ruta": str(nuevo)}]},
        {"tipo": "documentos", "carpetas": [{"archivo": {"ruta": str(doc / "requisitos.pdf")}}, {"archivo": {"ruta": str(doc / "no.pdf")}}]}]})
    assert f["id"] == "nuevo-proy" and f["principal"] == org.leer_ancla(nuevo) and any("No existe el archivo" in x for x in av), av
    fs = {x["id"]: x for x in org.fichas(False)}
    acc = [c for p in fs["nuevo-proy"]["partes"] for c in p["carpetas"] if c["ancla"].startswith("archivo:")]
    assert len(acc) == 1 and acc[0]["estado"] == "ok" and acc[0]["nombre"] == "requisitos.pdf", acc
    assert not (doc / org.ANCLA).exists(), "un acceso a archivo no pone ancla en su carpeta"
    assert org.dentro_de_proyecto(str(doc / "requisitos.pdf"))
    # ＋ Añadir carpetas: a la parte de su tipo (se crea), «Mover aquí» la quita del otro proyecto
    f, av = org.anadir_carpetas("nuevo-proy", [{"ruta": str(cal), "tipo": "entornos"}, {"ruta": str(nuevo), "tipo": "codigo"}],
                                movidas={str(cal): ["homeshape"]})
    assert any(p["tipo"] == "entornos" and p["carpetas"][0]["etapa"] == "Calidad" for p in f["partes"]) and any("Ya estaba" in x for x in av), (f, av)
    ac = org.leer_ancla(cal)
    assert not any(c["ancla"] == ac for p in org.leer_json(org._ficha_path("homeshape"), {})["partes"] for c in p["carpetas"]), "movida, no compartida"
    org.mover_carpeta("nuevo-proy", acc[0]["ancla"], "material")
    try:
        org.mover_carpeta("nuevo-proy", acc[0]["ancla"], "entornos")
        raise AssertionError("un archivo no es una etapa")
    except ValueError:
        pass
    (doc / "requisitos.pdf").unlink()
    assert any(x["id"].startswith("archivo:") and x["estado"] == "falta" for x in org.alertas())
    assert org.leer_version("nuevo-proy", org.versiones("nuevo-proy")[-1]["v"])["anclas"][acc[0]["ancla"]]["nombre"] == "requisitos.pdf"
    code, r = org.get("/api/org/analizar", {"ruta": str(hs)})
    assert code == 200 and r["git"]
    assert org.get("/api/org/sugerencias", {"nombre": "homeshape", "excluir": str(hs)})[0] == 200
    assert org.post("/api/org/ficha/anadir", {"id": "no-hay", "carpetas": []})[0] == 400

    # 🔗 carpetas sin ancla (por ruta), ¿se puede anclar?, crear estricto y pasar de un modo a otro
    assert org.puede_anclar(str(hs)) == (True, "") and org.puede_anclar(str(disco / "nada"))[0] is False
    assert org.puede_anclar(str(Path(str(disco)).anchor))[0] is False
    nube = carpeta("nube-raiz", archivos=["a.txt"])
    try:
        org.crear_ficha({"nombre": "Estricto", "estricto": True, "partes": [{"tipo": "otro", "carpetas": [{"ruta": str(disco / "nada")}]}]})
        raise AssertionError("debió negarse a crear un proyecto a medias")
    except ValueError as e:
        assert "No se creó" in str(e) and not org._ficha_path("estricto").exists()
    f, _ = org.crear_ficha({"nombre": "Nube", "estricto": True, "partes": [{"tipo": "otro", "carpetas": [{"porruta": {"ruta": str(nube)}}]}]})
    c0 = f["partes"][0]["carpetas"][0]
    assert c0["ancla"].startswith("ruta:") and c0["porruta"]["ruta"] == str(nube) and not (nube / org.ANCLA).exists(), c0
    cn = next(c for x in org.fichas(False) if x["id"] == "nube" for p in x["partes"] for c in p["carpetas"])
    assert cn["estado"] == "ok" and cn["nombre"] == "nube-raiz" and cn["porruta"], cn
    assert org.nombre_principal(org.leer_json(org._ficha_path("nube"), {})) == "nube-raiz"
    assert any(str(nube) == str(r) for r in org.rutas_permitidas()) and org.dentro_de_proyecto(str(nube / "a.txt"))
    _, av = org.anadir_carpetas("nube", [{"porruta": {"ruta": str(nube)}, "tipo": "otro"}])
    assert any("Ya estaba" in x for x in av), av
    nuevo = org.cambiar_modo_ancla("nube", c0["ancla"], "ancla")  # 🔗 → ancla
    assert org.ID_RE.fullmatch(nuevo) and org.leer_ancla(nube) == nuevo
    org.guardar_ficha("nube", {"principal": nuevo, "conexiones": [{"id": "k", "de": "n:" + nuevo, "a": "p", "etiqueta": "x"}]})
    otra = org.cambiar_modo_ancla("nube", nuevo, "ruta")  # ancla → 🔗 (se borra el archivo de ancla)
    g = org.leer_json(org._ficha_path("nube"), {})
    assert otra.startswith("ruta:") and not (nube / org.ANCLA).exists() and nuevo not in org.registro()
    assert g["principal"] == otra and g["conexiones"][0]["de"] == "n:" + otra, g
    shutil.rmtree(nube)
    assert next(c for x in org.fichas(False) if x["id"] == "nube" for p in x["partes"] for c in p["carpetas"])["estado"] == "falta"
    org.quitar_ficha("nube")
    a = org.analizar_ruta(str(hs))
    assert a["anclable"] is True and "motivo" in a

    # ☑ pendientes: en la ficha, texto de varias líneas, hecho con su fecha, unido a una carpeta; vacíos fuera; en el MAPA
    f, _ = org.guardar_ficha("nuevo-proy", {"pendientes": [{"texto": "Subir la web\nal VPS de calidad", "ancla": "abc"}, {"texto": "  "},
                                                           {"id": "x1", "texto": "Hecho ya", "hecho": True}]})
    pd = f["pendientes"]
    assert len(pd) == 2 and pd[0]["texto"] == "Subir la web\nal VPS de calidad" and pd[0]["ancla"] == "abc" and pd[0]["id"], pd
    assert pd[1]["hecho"] and pd[1]["hecho_en"] and pd[1]["id"] == "x1", pd
    assert org.guardar_ficha("nuevo-proy", {"estado": "pausado"})[0]["pendientes"] == pd, "lo que no llega se conserva"
    org.escribir_mapa()
    assert "- [ ] Subir la web" in (tmp / "datos" / "MAPA.md").read_text(encoding="utf-8") and "Hecho ya" not in (tmp / "datos" / "MAPA.md").read_text(encoding="utf-8")

    # «Contenedor con nombre»: la raíz es el nombre; se puede crear sin carpetas; posiciones aparte por modo
    f, _ = org.crear_ficha({"nombre": "Solo nombre", "raiz_nombre": True, "partes": []})
    assert f["raiz_nombre"] and f["partes"] == [] and not f.get("nombre_sigue"), f
    f, _ = org.guardar_ficha("nuevo-proy", {"raiz_nombre": True, "posiciones": {"flujo:nombre": {"p": {"x": 1, "y": 2}}, "otra": {}}})
    assert f["raiz_nombre"] and f["nombre_sigue"] is False and f["posiciones"]["flujo:nombre"]["p"] == {"x": 1.0, "y": 2.0} and "otra" not in f["posiciones"], f
    f, _ = org.guardar_ficha("nuevo-proy", {"raiz_nombre": False})
    assert f["raiz_nombre"] is False and f["posiciones"]["flujo:nombre"], "apagarlo no borra lo del otro modo"
    org.quitar_ficha("solo-nombre")

    # 🔍 del explorador: por nombre en subcarpetas, sin acentos ni separadores, saltando node_modules
    bq = carpeta("busca", "uno", "Canción_Final")
    carpeta("busca", "node_modules", "cancion-final")
    (bq / "cancion final.txt").write_text("x", encoding="utf-8")
    r = org.buscar_carpetas(str(bq.parent.parent), "cancion final")
    assert [x["nombre"] for x in r["resultados"]] == ["Canción_Final"] and r["completo"], r
    r = org.buscar_carpetas(str(bq.parent.parent), "cancionfinal", archivos=True)
    assert {x["nombre"] for x in r["resultados"]} == {"Canción_Final", "cancion final.txt"}, r
    assert org.buscar_carpetas(str(disco), "busca", limite=1)["completo"] is False
    assert org.get("/api/org/buscar_carpetas", {"en": str(disco), "q": ""})[0] == 400
    assert org.get("/api/org/buscar_carpetas", {"en": str(disco), "q": "uno"})[0] == 200

    # Quitar varios (casillas de la vista Lista), borrar anclas sin tocar las compartidas, recuperar y vaciar
    qa, qb, qc = carpeta("qa-codigo"), carpeta("qa-docs"), carpeta("qa-comun")
    org.crear_ficha({"nombre": "qa", "partes": [{"tipo": "codigo", "carpetas": [{"ruta": str(qa)}, {"ruta": str(qc)}]},
                                                {"tipo": "documentos", "carpetas": [{"ruta": str(qb)}]}]})
    org.crear_ficha({"nombre": "qb", "partes": [{"tipo": "codigo", "carpetas": [{"ruta": str(qc)}]}]})
    org.crear_ficha({"nombre": "qz", "partes": [{"tipo": "codigo", "carpetas": [{"ruta": str(qb)}]}]})
    ida, idc = org.leer_ancla(qa), org.leer_ancla(qc)
    code, r = org.post("/api/org/fichas/quitar", {"ids": ["qa", "qz"], "borrar_anclas": True})
    assert code == 200 and [x["id"] for x in r["quitados"]] == ["qa", "qz"], r
    assert not (qa / org.ANCLA).exists() and not (qb / org.ANCLA).exists() and ida not in org.registro(), "anclas borradas"
    assert org.leer_ancla(qc) == idc and [x["ruta"] for x in r["anclas_conservadas"]] == [str(qc)], "qc sigue en «qb»"
    assert qa.is_dir() and qb.is_dir(), "las carpetas no se tocan"
    lq = org.quitados()
    assert {"qa", "qz"} <= {x["id"] for x in lq} and lq[0]["quitado"] >= lq[-1]["quitado"]
    arch = next(x["archivo"] for x in lq if x["id"] == "qa")
    hechos, av = org.recuperar_quitados([arch])
    assert hechos == ["qa"] and org.leer_ancla(qa) == ida and ida in org.registro(), "vuelve con la misma ancla"
    assert not any(x["archivo"] == arch for x in org.quitados())
    org.crear_ficha({"nombre": "qz", "partes": []})
    _, av = org.recuperar_quitados([next(x["archivo"] for x in org.quitados() if x["id"] == "qz")])
    assert any("ya está en el tablero" in x for x in av), av
    assert org.post("/api/org/fichas/quitar", {"ids": []})[0] == 400
    assert org.post("/api/org/quitados/recuperar", {"archivos": ["../x.json"]})[0] == 400
    code, r = org.get("/api/org/quitados", {})
    assert code == 200 and r["quitados"]
    assert org.vaciar_quitados() == len(r["quitados"]) and not org.quitados()

    # 🖧 compartir entre equipos: PC-A sube sus fichas a la carpeta común; PC-B (otros datos, sin esas anclas) se une y
    # ve las carpetas de PC-A como «en otro equipo» (no como alerta); al dejar de compartir se trae una copia
    comun = tmp / "red" / "DeskLens"
    n_a = len(org.fichas_crudas())
    pv = org.previo_compartir(str(comun))
    assert pv["en_comun"] == 0 and pv["aqui"] == n_a and len(pv["solo_aqui"]) == n_a, pv
    org.activar_compartir(str(comun), "PC-A")
    assert org.COMUN == comun and len(list((comun / "proyectos").glob("*.json"))) == n_a
    pub = org.leer_json(comun / "equipos" / "PC-A.json", {})
    assert pub["equipo"] == "PC-A" and pub["anclas"], pub
    datos_a = org.DATA
    org.configurar(tmp / "datosB")
    assert org.COMUN == org.DATA and not org.fichas_crudas()
    assert org.previo_compartir(str(comun))["en_comun"] == n_a
    org.activar_compartir(str(comun), "PC-B")
    cs = [c for f in org.fichas() for p in f["partes"] for c in p["carpetas"] if c["ancla"] in pub["anclas"]]
    assert cs and all(c["estado"] == "otro_equipo" and c["equipo"] == "PC-A" for c in cs), {c["estado"] for c in cs}
    assert not any(a["id"] in pub["anclas"] for a in org.alertas()), "estar en otro equipo no es una alerta"
    code, r = org.get("/api/org/compartir", {})
    assert code == 200 and r["activo"] and {e["equipo"] for e in r["equipos"]} == {"PC-A", "PC-B"}, r
    assert org.desactivar_compartir()["traidas"] == n_a and org.COMUN == org.DATA and len(org.fichas_crudas()) == n_a
    org.configurar(datos_a)
    assert org.COMUN == comun
    org.desactivar_compartir()
    assert org.COMUN == org.DATA == datos_a and len(org.fichas_crudas()) == n_a
    assert org.post("/api/org/compartir/previo", {"carpeta": ""})[0] == 400

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
