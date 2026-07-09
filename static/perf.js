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

    ideias.forEach(i => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${i.id}</td>
            <td><div class="cell-box">${i.titulo}</div></td>
            <td>${i.data_criacao || "-"}</td>
            <td>${i.nome}</td>
            <td>${i.matricula}</td>
            <td>${i.supervisor || "-"}</td>
            <td>${i.area}</td>
            <td><div class="cell-box">${i.descricao}</div></td>
            <td><div class="cell-box">${i.antes_depois}</div></td>

            <td>
                <select data-impacto="${i.id}" onchange="salvar(${i.id})">
                    <option ${i.impacto === "Material" ? "selected" : ""}>Material</option>
                    <option ${i.impacto === "Processo" ? "selected" : ""}>Processo</option>
                    <option ${i.impacto === "Qualidade" ? "selected" : ""}>Qualidade</option>
                    <option ${i.impacto === "Segurança" ? "selected" : ""}>Segurança</option>
                    <option ${i.impacto === "Custo" ? "selected" : ""}>Custo</option>
                </select>
            </td>

            <td>
                <input type="number" data-saving="${i.id}" value="${i.saving_beneficio ?? 0}" placeholder="R$">
            </td>

            ${inputsBeneficio(i)}
            ${inputsEsforco(i)}

            <td id="beneficio-${i.id}">${Number(i.total_beneficio) || 0}</td>
            <td id="esforco-${i.id}">${Number(i.total_esforco) || 0}</td>
            <td id="prioridade-${i.id}">${traduzirPrioridade(Number(i.prioridade))}</td>

            <td>
                <select data-status="${i.id}" onchange="salvar(${i.id})">
                    <option ${(i.status || "").trim() === "Em análise" ? "selected" : ""}>Em análise</option>
                    <option ${(i.status || "").trim() === "Aprovada" ? "selected" : ""}>Aprovada</option>
                    <option ${(i.status || "").trim() === "Reprovada" ? "selected" : ""}>Reprovada</option>
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
// TRADUZIR PRIORIDADE
// ===============================
function traduzirPrioridade(p) {
    p = Number(p);

    if (p === 1) return "PRIORIZAR";
    if (p === 2) return "PROGRAMAR";
    if (p === 3) return "CONSIDERAR";
    if (p === 4) return "ARQUIVAR";
    return "-";
}


// ===============================
// SELECT PADRÃO
// ===============================
function selectOpcao(id, tipo, valor = 0) {

    valor = Number(valor) || 0;  // ✅ força número

    return `
        <select data-${tipo}="${id}" onchange="calcular(${id})">
            <option value="0" ${valor==0?"selected":""}>-</option>
            <option value="3" ${valor==3?"selected":""}>Baixo</option>
            <option value="6" ${valor==6?"selected":""}>Médio</option>
            <option value="9" ${valor==9?"selected":""}>Alto</option>
        </select>
    `;
}


// ===============================
// BENEFÍCIO
// ===============================
function inputsBeneficio(i) {
    return `
        <td>${selectOpcao(i.id, "beneficio", i.qualidade)}</td>
        <td>${selectOpcao(i.id, "beneficio", i.seguranca)}</td>
        <td>${selectOpcao(i.id, "beneficio", i.kpi)}</td>
        <td>${selectOpcao(i.id, "beneficio", i.saving_score)}</td>
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


// ===============================
// CALCULAR
// ===============================
function calcular(id) {

    const b = Array.from(document.querySelectorAll(`[data-beneficio="${id}"]`))
        .map(i => Number(i.value) || 0);

    const e = Array.from(document.querySelectorAll(`[data-esforco="${id}"]`))
        .map(i => Number(i.value) || 0);

    while (b.length < 5) b.push(0);
    while (e.length < 6) e.push(0);

    const ben =
        (b[0]*0.2) +
        (b[1]*0.2) +
        (b[2]*0.1) +
        (b[3]*0.5) +
        (b[4]*0.2);

    const esf =
        (e[0]*0.2) +
        (e[1]*0.25) +
        (e[2]*0.3) +
        (e[3]*0.05) +
        (e[4]*0.05) +
        (e[5]*0.15);

    const benFinal = isNaN(ben) ? 0 : ben;
    const esfFinal = isNaN(esf) ? 0 : esf;

    document.getElementById(`beneficio-${id}`).innerText = benFinal.toFixed(2);
    document.getElementById(`esforco-${id}`).innerText = esfFinal.toFixed(2);

    let prioridade = "CONSIDERAR";

    if (benFinal < 4) {
        prioridade = "ARQUIVAR";
    }
    else if (benFinal >= 7.5 && esfFinal < 3) {
        prioridade = "PRIORIZAR";
    }
    else if (benFinal >= 7.5 && esfFinal >= 6) {
        prioridade = "PROGRAMAR";
    }
    else if (benFinal >= 4 && benFinal <= 7.4 && esfFinal > 3) {
        prioridade = "CONSIDERAR (baixo)";
    }
    else if (benFinal >= 4 && esfFinal <= 3) {
        prioridade = "CONSIDERAR";
    }

    const el = document.getElementById(`prioridade-${id}`);
    el.innerText = prioridade;

    if (prioridade === "PRIORIZAR") el.style.color = "#16a34a";
    else if (prioridade === "PROGRAMAR") el.style.color = "#ca8a04";
    else if (prioridade === "CONSIDERAR") el.style.color = "#2563eb";
    else el.style.color = "#6b7280";
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
    const impacto = document.querySelector(`[data-impacto="${id}"]`).value;

    const b = Array.from(document.querySelectorAll(`[data-beneficio="${id}"]`))
        .map(i => Number(i.value) || 0);

    const e = Array.from(document.querySelectorAll(`[data-esforco="${id}"]`))
        .map(i => Number(i.value) || 0);

    const totalBen = Number(document.getElementById(`beneficio-${id}`).innerText);
    const totalEsf = Number(document.getElementById(`esforco-${id}`).innerText);
    const prioridade = document.getElementById(`prioridade-${id}`).innerText;

    let prioridadeNum = 3;

    if (prioridade === "PRIORIZAR") prioridadeNum = 1;
    else if (prioridade === "PROGRAMAR") prioridadeNum = 2;
    else if (prioridade === "CONSIDERAR") prioridadeNum = 3;
    else if (prioridade === "CONSIDERAR (baixo)") prioridadeNum = 4;
    else if (prioridade === "ARQUIVAR") prioridadeNum = 4;

    const savingReal = Number(document.querySelector(`[data-saving="${id}"]`)?.value || 0);

    const payload = {
        id,
        status,
        impacto,
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