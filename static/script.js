document.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // LOGIN
    // ===============================
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData(loginForm);

            const dados = {
                matricula: formData.get("matricula"),
                senha: formData.get("senha")
            };

            try {
                const resp = await fetch("/api/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                });

                if (resp.ok) {
                    window.location.href = "/";
                } else {
                    alert("❌ Login inválido. Verifique matrícula e senha.");
                }

            } catch (err) {
                console.error(err);
                alert("❌ Erro de conexão com o servidor");
            }
        });
    }

    // ===============================
    // ENVIO DE IDEIA
    // ===============================
    const formIdeia = document.getElementById("formIdeia");

    if (formIdeia) {
        formIdeia.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData(formIdeia);

            const dados = {
                nome: formData.get("nome"),
                matricula: formData.get("matricula"),
                area: formData.get("area"),
                supervisor: formData.get("supervisor"),
                titulo: formData.get("titulo"),
                descricao: formData.get("descricao"),
                antes_depois: formData.get("antes_depois"),
                equipamento: formData.get("equipamento"),
                peca: formData.get("peca"),
                material: formData.get("material"),
                part_number: formData.get("part_number"),
                area_aplicacao: formData.get("area_aplicacao")
            };

            try {
                const resp = await fetch("/api/ideias", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                });

                if (resp.ok) {
                    alert("✅ Ideia enviada com sucesso!");
                    formIdeia.reset();

                    // 🔥 Atualiza a lista na home automaticamente
                    carregarMinhasIdeias();

                } else {
                    alert("❌ Erro ao enviar ideia");
                }

            } catch (err) {
                console.error(err);
                alert("❌ Erro de conexão");
            }
        });
    }

    // ===============================
    // MINHAS IDEIAS (HOME)
    // ===============================
    carregarMinhasIdeias();

});


// ✅ FUNÇÃO PRINCIPAL (HOME)
async function carregarMinhasIdeias() {

    const container = document.getElementById("listaIdeias");
    if (!container) return;

    try {
        const resp = await fetch("/api/minhas-ideias");

        if (!resp.ok) {
            throw new Error("Erro API");
        }

        const ideias = await resp.json();

        if (!Array.isArray(ideias) || ideias.length === 0) {
            container.innerHTML = `
                <div class="sem-ideias">
                     Nenhuma ideia registrada
                </div>
            `;
            return;
        }

        renderIdeias(ideias, false);

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="sem-ideias">
                ⚠️ Erro ao carregar ideias
            </div>
        `;
    }
}
function renderIdeias(ideias, expandido) {

    const container = document.getElementById("listaIdeias");

    let html = "";

    const lista = expandido ? ideias : ideias.slice(0, 3);

    lista.forEach(i => {

        let classe = "analise";
        let emoji = "⏳";
        let status = i.status || "Em análise";

        if (status === "Aprovada") {
            classe = "aprovado";
            emoji = "✅";
        } else if (status === "Reprovada") {
            classe = "reprovado";
            emoji = "❌";
        }

        html += `
            <div class="ideia-card ${classe}">
                <div class="ideia-info">
                    <span class="ideia-desc">
                        <b>${i.titulo}</b><br>
                        ${i.descricao}
                    </span>
                </div>
                <div class="ideia-status">
                    ${emoji} ${status}
                </div>
            </div>
        `;
    });

    // ✅ BOTÃO VER MAIS / MENOS
    if (ideias.length > 3) {
        html += `
            <div class="ver-mais" onclick="toggleIdeias()">
                ${expandido ? "▲ Mostrar menos" : "▼ Ver mais ideias"}
            </div>
        `;
    }

    container.innerHTML = html;

    // salva estado
    window._ideiasCache = ideias;
    window._expandido = expandido;
}
function toggleIdeias() {
    renderIdeias(window._ideiasCache, !window._expandido);
}