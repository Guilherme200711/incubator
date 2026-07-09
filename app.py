from flask import Flask, request, jsonify, render_template, session, redirect, send_file
from flask_cors import CORS
import psycopg2
import os
from dotenv import load_dotenv
from openpyxl import load_workbook
from openpyxl import Workbook
from datetime import datetime
from threading import Lock

excel_lock = Lock()


file_path = "Performance_Projetos.xlsx"


if not os.path.isfile(file_path):
    with excel_lock:
        wb = Workbook()   # ✅ CRIA novo arquivo
        ws = wb.active

        ws.append([
            "ID",
            "Titulo",
            "Data",
            "Nome",
            "Matricula",
            "Gestor",
            "Area",
            "Descricao",
            "Antes/Depois",
            "Impacto",
            "Saving (R$)",

            "Qualidade",
            "Seguranca",
            "KPI",
            "Saving Score",
            "Norma",

            "Mudança Processo",
            "Mudança Material",
            "Tempo",
            "Treinamento",
            "Logistica",
            "Fornecedor",

            "Total Beneficio",
            "Total Esforco",
            "Prioridade",
            "Status"
        ])

        wb.save(file_path)   # ✅ salva o arquivo criado

load_dotenv()  

app = Flask(__name__, template_folder="templates", static_folder="static")

DATABASE_URL = os.getenv("DATABASE_URL")

app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True
app.secret_key = "incubadora-nissan"

CORS(app)

SENHA_PERFORMANCE = "123"

def conectar_db():
    return psycopg2.connect(DATABASE_URL, sslmode="require")

def sincronizar_excel():

    conn = conectar_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            id,
            titulo,
            data_criacao,
            nome,
            matricula,
            supervisor,
            area,
            descricao,
            antes_depois,

            impacto,
            saving_real,

            qualidade,
            seguranca,
            kpi,
            saving_beneficio,
            norma,

            mudanca_processo,
            mudanca_material,
            tempo,
            treinamento,
            logistica,
            fornecedor,

            total_beneficio,
            total_esforco,
            prioridade,
            status

        FROM ideias
        ORDER BY id
    """)

    dados = cur.fetchall()

    cur.close()
    conn.close()

    with excel_lock:

        wb = load_workbook(file_path)
        ws = wb.active

        # Apaga todas as linhas de dados
        if ws.max_row > 1:
            ws.delete_rows(2, ws.max_row)

        # Recria o Excel usando o banco
        for r in dados:

            ws.append([
                r[0],   # ID
                r[1],   # Titulo
                str(r[2]) if r[2] else "",  # Data
                r[3],   # Nome
                r[4],   # Matricula
                r[5],   # Gestor
                r[6],   # Area
                r[7],   # Descricao
                r[8],   # Antes/Depois

                r[9],   # Impacto
                r[10],  # Saving (R$)

                r[11],  # Qualidade
                r[12],  # Seguranca
                r[13],  # KPI
                r[14],  # Saving Score
                r[15],  # Norma

                r[16],  # Mudança Processo
                r[17],  # Mudança Material
                r[18],  # Tempo
                r[19],  # Treinamento
                r[20],  # Logistica
                r[21],  # Fornecedor

                r[22],  # Total Beneficio
                r[23],  # Total Esforco
                r[24],  # Prioridade
                r[25]   # Status
            ])

        wb.save(file_path)


@app.route("/")
def index():
    if "usuario_id" not in session:
        return redirect("/login")

    return render_template(
        "index.html",
        nome=session["nome"],
        matricula=session["matricula"]
    )


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/cadastro")
def cadastro():
    return render_template("cadastro.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


@app.route("/formulario")
def formulario():
    if "usuario_id" not in session:
        return redirect("/login")

    return render_template(
        "formulario.html",
        nome=session["nome"],
        matricula=session["matricula"],
        area=session.get("area")
    )


@app.route("/performance")
def performance():
    return render_template("performance.html")


@app.route("/baixar-excel")
def baixar_excel():
    return send_file("Performance_Projetos.xlsx", as_attachment=True)


@app.route("/ranking")
def ranking():
    return render_template("ranking.html")

@app.route("/api/ranking")
def api_ranking():

    conn = conectar_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT nome, area, titulo, prioridade
        FROM ideias
        WHERE status = 'Aprovada'
        ORDER BY prioridade ASC, total_beneficio DESC
    """)

    dados = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify([
        {
            "nome": r[0],
            "area": r[1],
            "titulo": r[2],
            "pontuacao": r[3]
        }
        for r in dados
    ])

@app.route("/contato")
def contato():
    return render_template("contato.html")


@app.route("/api/login", methods=["POST"])
def api_login():
    d = request.get_json()
    if not d:
        return jsonify({"erro": "JSON inválido"}), 400

    conn = conectar_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, nome, area
        FROM usuarios
        WHERE matricula = %s AND senha = %s
    """, (d["matricula"], d["senha"]))

    user = cur.fetchone()

    if not user:
        cur.close()
        conn.close()
        return jsonify({"erro": "Usuário não encontrado"}), 401

    session["usuario_id"] = user[0]
    session["nome"] = user[1]
    session["matricula"] = d["matricula"]
    session["area"] = user[2]

    cur.close()
    conn.close()

    return jsonify({"ok": True})


@app.route("/api/cadastro", methods=["POST"])
def api_cadastro():
    d = request.get_json()
    if not d:
        return jsonify({"erro": "JSON inválido"}), 400

    conn = conectar_db()
    cur = conn.cursor()

    cur.execute("SELECT id FROM usuarios WHERE matricula = %s", (d["matricula"],))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"erro": "Usuário já existe"}), 400

    cur.execute("""
        INSERT INTO usuarios (nome, matricula, senha)
        VALUES (%s, %s, %s)
    """, (d["nome"], d["matricula"], d["senha"]))

    conn.commit()

    cur.execute("SELECT id FROM usuarios WHERE matricula = %s", (d["matricula"],))
    user_id = cur.fetchone()[0]

    session["usuario_id"] = user_id
    session["nome"] = d["nome"]
    session["matricula"] = d["matricula"]

    cur.close()
    conn.close()

    return jsonify({"ok": True})


@app.route("/api/ideias", methods=["POST"])
def enviar_ideia():
    if "usuario_id" not in session:
        return jsonify({"erro": "Não autorizado"}), 401

    d = request.get_json()
    if not d:
        return jsonify({"erro": "JSON inválido"}), 400

    conn = conectar_db()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO ideias (
        usuario_id, nome, matricula, area, supervisor,
        titulo, descricao, antes_depois,
        equipamento, peca, material, part_number,
        area_aplicacao
    )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        session["usuario_id"],
        d["nome"],
        d["matricula"],
        d["area"],
        d["supervisor"],
        d["titulo"],
        d["descricao"],
        d["antes_depois"],
        d.get("equipamento"),
        d.get("peca"),
        d.get("material"),
        d.get("part_number"),
        d["area_aplicacao"]
    ))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"ok": True})


@app.route("/api/performance/auth", methods=["POST"])
def auth_performance():
    d = request.get_json()
    if not d:
        return jsonify({"erro": "JSON inválido"}), 400

    if d.get("senha") == SENHA_PERFORMANCE:
        session["performance_autorizado"] = True
        return jsonify({"ok": True})

    return jsonify({"erro": "Senha incorreta"}), 401


def autorizado():
    return session.get("performance_autorizado") is True


@app.before_request
def proteger():
    if request.path.startswith("/api/performance") and not request.path.endswith("/auth"):
        if not autorizado():
            return jsonify({"erro": "Não autorizado"}), 401


@app.route("/api/performance/ideias")
def listar_ideias():
    conn = conectar_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            id, titulo, data_criacao, nome, matricula, supervisor,
            area, descricao, antes_depois, status, impacto,

            qualidade, seguranca, kpi, saving_beneficio,
            saving_real,
            norma,

            mudanca_processo, mudanca_material, tempo,
            treinamento, logistica, fornecedor,

            total_beneficio,
            total_esforco,
            prioridade
        FROM ideias
        ORDER BY prioridade ASC, data_criacao DESC

    """)

    dados = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify([
    {
        "id": r[0],
        "titulo": r[1],
        "data_criacao": str(r[2]),
        "nome": r[3],
        "matricula": r[4],
        "supervisor": r[5],
        "area": r[6],
        "descricao": r[7],
        "antes_depois": r[8],
        "status": r[9],
        "impacto": r[10],
        "saving_real": r[11],

        "qualidade": r[12],
        "seguranca": r[13],
        "kpi": r[14],
        "saving_beneficio": r[15],
        "norma": r[16],

        "mudanca_processo": r[17],
        "mudanca_material": r[18],
        "tempo": r[19],
        "treinamento": r[20],
        "logistica": r[21],
        "fornecedor": r[22],

        "total_beneficio": r[23],
        "total_esforco": r[24],
        "prioridade": r[25]
    }
    for r in dados
    ])


@app.route("/api/performance/deletar/<int:id>", methods=["DELETE"])
def deletar_ideia(id):

    conn = conectar_db()
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM ideias WHERE id = %s",
        (id,)
    )

    conn.commit()

    cur.close()
    conn.close()

    sincronizar_excel()

    return jsonify({"ok": True})

@app.route("/api/performance/avaliar", methods=["POST"])
def avaliar_ideia():
    d = request.get_json()
    id_recebido = int(d["id"])

    # ✅ BLOQUEIO DEFINITIVO
    if d["prioridade"] not in [1, 2, 3, 4]:
        d["prioridade"] = 3


    conn = conectar_db()
    cur = conn.cursor()

    cur.execute("""
    UPDATE ideias SET
        status = %s,
        impacto = %s,
        pontuacao = %s,

        qualidade = %s,
        seguranca = %s,
        kpi = %s,
        saving_beneficio = %s,
        saving_real = %s,
        norma = %s,

        mudanca_processo = %s,
        mudanca_material = %s,
        tempo = %s,
        treinamento = %s,
        logistica = %s,
        fornecedor = %s,

        total_beneficio = %s,
        total_esforco = %s,
        prioridade = %s

    WHERE id = %s
    """, (
        d["status"],
        d["impacto"],
        d["pontuacao"],

        d["qualidade"],
        d["seguranca"],
        d["kpi"],
        d["saving_beneficio"],  # score
        d["saving_real"],       # novo campo

        d["norma"],

        d["mudanca_processo"],
        d["mudanca_material"],
        d["tempo"],
        d["treinamento"],
        d["logistica"],
        d["fornecedor"],

        d["total_beneficio"],
        d["total_esforco"],
        d["prioridade"],

        d["id"]
    ))

    conn.commit()

    # ✅ CORREÇÃO
    cur.execute("""
        SELECT titulo, nome, matricula, supervisor, area, descricao, antes_depois, data_criacao
        FROM ideias
        WHERE id = %s
    """, (id_recebido,))
    info = cur.fetchone()

    if not info:
        cur.close()
        conn.close()
        return jsonify({"erro": "Ideia não encontrada"}), 404

    with excel_lock:
        try:

            wb = load_workbook(file_path)
            ws = wb.active

            def normalizar(valor):
                try:
                    return int(float(valor))
                except:
                    return None

            linha_existente = None

            for row in ws.iter_rows(min_row=2):
                if normalizar(row[0].value) == id_recebido:
                    linha_existente = row
                    break

            if linha_existente:

                linha_existente[0].value = id_recebido
                linha_existente[1].value = info[0]

                data = str(info[7]) if len(info) > 7 else ""
                linha_existente[2].value = data

                linha_existente[3].value = info[1]
                linha_existente[4].value = info[2]
                linha_existente[5].value = info[3]
                linha_existente[6].value = info[4]
                linha_existente[7].value = info[5]
                linha_existente[8].value = info[6]

                linha_existente[9].value = d["impacto"]
                linha_existente[10].value = d["saving_real"]

                linha_existente[11].value = d["qualidade"]
                linha_existente[12].value = d["seguranca"]
                linha_existente[13].value = d["kpi"]
                linha_existente[14].value = d["saving_beneficio"]
                linha_existente[15].value = d["norma"]

                linha_existente[16].value = d["mudanca_processo"]
                linha_existente[17].value = d["mudanca_material"]
                linha_existente[18].value = d["tempo"]
                linha_existente[19].value = d["treinamento"]
                linha_existente[20].value = d["logistica"]
                linha_existente[21].value = d["fornecedor"]

                linha_existente[22].value = d["total_beneficio"]
                linha_existente[23].value = d["total_esforco"]
                linha_existente[24].value = d["prioridade"]
                linha_existente[25].value = d["status"]

            else:

                ws.append([
                    id_recebido,
                    info[0],
                    str(info[7]),
                    info[1],
                    info[2],
                    info[3],
                    info[4],
                    info[5],
                    info[6],

                    d["impacto"],
                    d["saving_real"],

                    d["qualidade"],
                    d["seguranca"],
                    d["kpi"],
                    d["saving_beneficio"],
                    d["norma"],

                    d["mudanca_processo"],
                    d["mudanca_material"],
                    d["tempo"],
                    d["treinamento"],
                    d["logistica"],
                    d["fornecedor"],

                    d["total_beneficio"],
                    d["total_esforco"],
                    d["prioridade"],
                    d["status"]
                ])

            wb.save(file_path)

            cur.close()
            conn.close()

            return jsonify({"ok": True})

        except Exception as e:
            print("ERRO GERAL:", e)

            cur.close()
            conn.close()

            return jsonify({"erro": str(e)}), 500

@app.route("/api/minhas-ideias")
def minhas_ideias():

    if "usuario_id" not in session:
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, titulo, descricao, status
        FROM ideias
        WHERE usuario_id = %s
        ORDER BY
            CASE 
                WHEN status = 'Aprovada' THEN 1
                WHEN status = 'Em análise' THEN 2
                WHEN status = 'Reprovada' THEN 3
                ELSE 4
            END,
            data_criacao DESC
    """, (session["usuario_id"],))

    dados = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify([
        {
            "id": r[0],
            "titulo": r[1],
            "descricao": r[2],
            "status": r[3] if r[3] else "Em análise"
        }
        for r in dados
    ])


if __name__ == "__main__":
    print("SINCRONIZANDO EXCEL...")
    sincronizar_excel()
    print("EXCEL SINCRONIZADO!")

    app.run(debug=True)