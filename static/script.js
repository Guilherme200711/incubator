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
                nome: formData.get("nome"),
                matricula: formData.get("matricula")
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
                    alert("❌ Não foi possível acessar.");
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

        try {

            const resp = await fetch("/api/ideias", {
                method: "POST",
                body: formData
            });

            const resultado = await resp.json();

            if (resp.ok) {

                abrirModal(resultado.protocolo);
                    formIdeia.reset();
                    carregarMinhasIdeias();
            } else {

                alert(resultado.erro || "Erro ao enviar ideia");

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
        let status = i.status || "Validação";

        if (status === "Não Viável") {
            classe = "reprovado";
            emoji = "❌";
        }

        else if (
            status === "Incubadora" ||
            status === "Projeto" ||
            status === "Execução Rápida" ||
            status === "Implementação"
        ) {
            classe = "aprovado";
            emoji = "🚀";
        }

        else if (status === "Aplicada") {
            classe = "aprovado";
            emoji = "✅";
        }

        else if (status === "Concluída") {
            classe = "aprovado";
            emoji = "🏆";
        }

        else if (status === "Não Priorizada") {
            classe = "analise";
            emoji = "📌";
        }


        html += `
            <div class="ideia-card ${classe}">
                <div class="ideia-info">
                    <span class="ideia-desc">
                        <span class="protocolo">
                           Protocolo: 2026_${String(i.id).padStart(4, "0")}
                        </span>
                        ${i.ideia}
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
function abrirModal(protocolo) {

    document.getElementById("numeroProtocolo").textContent =
        protocolo;

    document
        .getElementById("modalSucesso")
        .classList.add("ativo");
}

function fecharModal() {

    document
        .getElementById("modalSucesso")
        .classList.remove("ativo");
}