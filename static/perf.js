document.addEventListener("DOMContentLoaded", async () => {

    const senha = prompt("🔒 Digite a senha da Performance:");

    const auth = await fetch("/api/performance/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha })
    });

    if (!auth.ok) {
        alert("❌ Senha incorreta");
        window.location.href = "/";
        return;
    }

    carregarIdeias();
});


// ===============================
// CARREGAR IDEIAS
// ===============================
async function carregarIdeias() {

    const tbody = document.getElementById("tabelaIdeias");
    tbody.innerHTML = "";

    const res = await fetch("/api/performance/ideias");
    const ideias = await res.json();

    console.log("IDEIAS:", ideias); // ✅ DEBUG

    const totalIdeias = ideias.length;

    ideias.forEach(i => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${i.id ?? "-"}</td>
            <td>${i.data_criacao ?? "-"}</td>
            <td>${i.nome ?? "-"}</td>
            <td>${i.matricula ?? "-"}</td>
            <td>${i.area ?? "-"}</td>
            <td>${i.supervisor ?? "-"}</td>

            <td><div class="cell-box">${i.observacao || "-"}</div></td>
            <td><div class="cell-box">${i.ideia || "-"}</div></td>
            <td><div class="cell-box">${i.local_ocorrencia || "-"}</div></td>
            <td><div class="cell-box">${i.beneficio || "-"}</div></td>
            <td>${i.frequencia || "-"}</td>
<td>${i.apoio || "-"}</td>

        <td>
            <input
                type="number"
                data-saving="${i.id}"
                value="${i.saving_real ?? 0}"
                placeholder="R$"
            >
        </td>

        ${inputsBeneficio(i)}
        ${inputsEsforco(i)}



        <td>
            <select data-prioridade="${i.id}">
                ${Array.from(
                    { length: totalIdeias },
                    (_, idx) =>
                        `<option value="${idx + 1}"
                            ${i.prioridade == idx + 1 ? "selected" : ""}>
                            ${idx + 1}
                        </option>`
                ).join("")}
            </select>
        </td>

        <td>
        <select data-status="${i.id}" onchange="salvar(${i.id})">
            <option ${(i.status || "").trim() === "Validação" ? "selected" : ""}>Validação</option>
            <option ${(i.status || "").trim() === "Não Viável" ? "selected" : ""}>Não Viável</option>
            <option ${(i.status || "").trim() === "Incubadora" ? "selected" : ""}>Incubadora</option>
            <option ${(i.status || "").trim() === "Projeto" ? "selected" : ""}>Projeto</option>
            <option ${(i.status || "").trim() === "Execução Rápida" ? "selected" : ""}>Execução Rápida</option>
            <option ${(i.status || "").trim() === "Não Priorizada" ? "selected" : ""}>Não Priorizada</option>
            <option ${(i.status || "").trim() === "Implementação" ? "selected" : ""}>Implementação</option>
            <option ${(i.status || "").trim() === "Aplicada" ? "selected" : ""}>Aplicada</option>
            <option ${(i.status || "").trim() === "Concluída" ? "selected" : ""}>Concluída</option>
        </select>
    </td>

            <td>
                <button onclick="salvar(${i.id})">💾</button>
                <button onclick="deletar(${i.id})">🗑️</button>
            </td>
        `;

        tbody.appendChild(tr);

        calcular(i.id);
    });
}


// ===============================
// SELECT PADRÃO
// ===============================
function selectOpcao(id, tipo, valor = 0) {

    valor = Number(valor) || 0;

    return `
        <select data-${tipo}="${id}" onchange="calcular(${id})">
            <option value="0" ${valor == 0 ? "selected" : ""}>-</option>
            <option value="3" ${valor == 3 ? "selected" : ""}>Baixo</option>
            <option value="6" ${valor == 6 ? "selected" : ""}>Médio</option>
            <option value="9" ${valor == 9 ? "selected" : ""}>Alto</option>
        </select>
    `;
}

function inputsBeneficio(i) {
    return `
        <td>${selectOpcao(i.id, "beneficio", i.qualidade)}</td>
        <td>${selectOpcao(i.id, "beneficio", i.seguranca)}</td>
        <td>${selectOpcao(i.id, "beneficio", i.kpi)}</td>
        <td>${selectOpcao(i.id, "beneficio", i.saving_beneficio)}</td>
        <td>${selectOpcao(i.id, "beneficio", i.norma)}</td>
    `;
}

// ===============================
// ESFORÇO
// ===============================
function inputsEsforco(i) {
    return `
        <td>${selectOpcao(i.id, "esforco", i.mudanca_processo)}</td>
        <td>${selectOpcao(i.id, "esforco", i.mudanca_material)}</td>
        <td>${selectOpcao(i.id, "esforco", i.tempo)}</td>
        <td>${selectOpcao(i.id, "esforco", i.treinamento)}</td>
        <td>${selectOpcao(i.id, "esforco", i.logistica)}</td>
        <td>${selectOpcao(i.id, "esforco", i.fornecedor)}</td>
    `;
}

function mostrarSalvo() {
    const el = document.getElementById("mensagemSalvo");

    if (!el) return;

    // resetar estado antes de mostrar
    el.style.display = "block";
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px)";

    // força reflow pra reiniciar animação
    void el.offsetWidth;

    // mostrar
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";

    // esconder depois
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translateY(-10px)";

        setTimeout(() => {
            el.style.display = "none"; // ✅ ESSENCIAL
        }, 300);
    }, 2000);
}

// ===============================
// SALVAR
// ===============================
async function salvar(id) {

    id = Number(id);

    calcular(id);

    const status = document.querySelector(`[data-status="${id}"]`).value.trim();

    const b = Array.from(document.querySelectorAll(`[data-beneficio="${id}"]`))
        .map(i => Number(i.value) || 0);

    const e = Array.from(document.querySelectorAll(`[data-esforco="${id}"]`))
        .map(i => Number(i.value) || 0);

    const totalBen = 0;
    const totalEsf = 0;
    const prioridadeNum =
    Number(
        document.querySelector(`[data-prioridade="${id}"]`)?.value
    ) || null;

    const savingReal = Number(document.querySelector(`[data-saving="${id}"]`)?.value || 0);

    const payload = {
        id,
        status,
        pontuacao: 0,

        qualidade: b[0],
        seguranca: b[1],
        kpi: b[2],
        saving_beneficio: b[3],  // score
        saving_real: savingReal, // dinheiro

        norma: b[4],

        mudanca_processo: e[0],
        mudanca_material: e[1],
        tempo: e[2],
        treinamento: e[3],
        logistica: e[4],
        fornecedor: e[5],

        total_beneficio: totalBen,
        total_esforco: totalEsf,

        prioridade: prioridadeNum
    };

    console.log("ENVIANDO:", payload);

    const resp = await fetch("/api/performance/avaliar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (resp.ok) {
        mostrarSalvo(); // ✅ mensagem no topo
    } else {
        const erro = await resp.text();
        console.error("ERRO BACK:", erro);
        alert("❌ erro ao salvar\n\n" + erro);
    }

}
async function deletar(id) {

    if (!confirm("Tem certeza que deseja deletar?")) return;

    const resp = await fetch(`/api/performance/deletar/${id}`, {
        method: "DELETE"
    });

    if (resp.ok) {
        alert("✅ Deletado com sucesso!");
        await carregarIdeias();
    } else {
        alert("❌ erro ao deletar");
    }
}