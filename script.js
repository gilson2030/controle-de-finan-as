// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBt0DqN-zVUAtdRKLT9Evu1hlw8ykLxs_w",
  authDomain: "controle-rolli.firebaseapp.com",
  projectId: "controle-rolli",
  storageBucket: "controle-rolli.firebasestorage.app",
  messagingSenderId: "843955928588",
  appId: "1:843955928588:web:2e54bc5e35b414a0657829"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const COLLECTION = "transacoes";

// Troca de telas
window.mostrarTela = function(tela) {
  document.querySelectorAll('.tela').forEach(el => el.style.display = 'none');
  document.getElementById(tela).style.display = 'block';
  if (tela === 'dashboard') atualizarTudo();
  if (tela === 'transacoes') atualizarTudo();
};

// Filtros
let listaTransacoes = [];
let filtros = {
  dataInicio: null,
  dataFim: null,
  produto: "",
  categoria: ""
};
function aplicarFiltros() {
  filtros.dataInicio = document.getElementById("filtroDataInicio").value || null;
  filtros.dataFim = document.getElementById("filtroDataFim").value || null;
  filtros.produto = document.getElementById("filtroProduto").value.trim().toLowerCase();
  filtros.categoria = document.getElementById("filtroCategoria").value.trim().toLowerCase();
  atualizarTudo();
}
function limparFiltros() {
  document.getElementById("filtroDataInicio").value = "";
  document.getElementById("filtroDataFim").value = "";
  document.getElementById("filtroProduto").value = "";
  document.getElementById("filtroCategoria").value = "";
  filtros = { dataInicio: null, dataFim: null, produto: "", categoria: "" };
  atualizarTudo();
}
function filtrarTransacoes(transacoes) {
  return transacoes.filter(t => {
    let ok = true;
    if (filtros.dataInicio) ok = ok && new Date(t.data) >= new Date(filtros.dataInicio);
    if (filtros.dataFim) ok = ok && new Date(t.data) <= new Date(filtros.dataFim + "T23:59:59");
    if (filtros.produto) ok = ok && t.produto && t.produto.toLowerCase().includes(filtros.produto);
    if (filtros.categoria) ok = ok && t.categoria && t.categoria.toLowerCase().includes(filtros.categoria);
    return ok;
  });
}

// Firebase funções
async function carregarTransacoes() {
  const snapshot = await db.collection(COLLECTION).orderBy('data', 'asc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function salvarTransacao(produto, categoria, valor, tipo) {
  await db.collection(COLLECTION).add({
    produto,
    categoria,
    valor,
    tipo,
    data: new Date().toISOString()
  });
}
async function excluirTransacao(id) {
  await db.collection(COLLECTION).doc(id).delete();
}

// Atualização principal
async function atualizarTudo() {
  const transacoesOriginais = await carregarTransacoes();
  listaTransacoes = filtrarTransacoes(transacoesOriginais);

  let totalVendas = 0, totalCustos = 0;
  const tbody = document.querySelector('#tabelaTransacoes tbody');
  if (tbody) {
    tbody.innerHTML = '';
    listaTransacoes.forEach((t, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.produto || ""}</td>
        <td>${t.categoria || ""}</td>
        <td>${t.tipo === 'venda' ? 'Venda' : 'Despesa'}</td>
        <td>${t.tipo === 'venda' ? '+' : '-'} R$ ${t.valor.toFixed(2)}</td>
        <td>${t.data ? new Date(t.data).toLocaleDateString() : ""}</td>
        <td><button onclick="removerTransacaoConfirm('${t.id}')">🗑️</button></td>
      `;
      tbody.appendChild(tr);

      if (t.tipo === 'venda') totalVendas += t.valor;
      else totalCustos += t.valor;
    });
  }

  const lucroLiquido = totalVendas - totalCustos;
  if (document.getElementById('lucroLiquido'))
    document.getElementById('lucroLiquido').textContent = 'R$ ' + lucroLiquido.toFixed(2);
  if (document.getElementById('totalVendas'))
    document.getElementById('totalVendas').textContent = 'R$ ' + totalVendas.toFixed(2);
  if (document.getElementById('totalCustos'))
    document.getElementById('totalCustos').textContent = 'R$ ' + totalCustos.toFixed(2);

  atualizarGraficoPizzaResumo(totalVendas, totalCustos, lucroLiquido);
}

// Gráfico de pizza do resumo
function atualizarGraficoPizzaResumo(totalVendas, totalCustos, lucroLiquido) {
  if (window.graficoPizzaResumo && window.graficoPizzaResumo.destroy) {
    window.graficoPizzaResumo.destroy();
    window.graficoPizzaResumo = null;
  }
  const options = {
    chart: { type: 'pie', height: 340 },
    series: [
      Math.max(0, lucroLiquido),
      Math.max(0, totalVendas),
      Math.max(0, totalCustos)
    ],
    labels: ['Lucro Líquido', 'Total de Vendas', 'Total de Custos'],
    colors: ['#7c39e6', '#ffc233', '#f76c6c'],
    legend: { position: 'bottom' }
  };
  if (document.getElementById('graficoPizzaResumo')) {
    window.graficoPizzaResumo = new ApexCharts(document.getElementById('graficoPizzaResumo'), options);
    window.graficoPizzaResumo.render();
  }
}

// CATEGORIA dinâmica (select ou nova)
const selectCategoria = document.getElementById('categoria');
const inputNovaCategoria = document.getElementById('categoriaPersonalizada');
if(selectCategoria && inputNovaCategoria) {
  selectCategoria.addEventListener('change', function() {
    if(this.value === 'nova') {
      inputNovaCategoria.style.display = 'block';
      inputNovaCategoria.required = true;
    } else {
      inputNovaCategoria.style.display = 'none';
      inputNovaCategoria.required = false;
    }
  });
}

// Formulário transação
const formTransacao = document.getElementById('formTransacao');
if (formTransacao) {
  formTransacao.onsubmit = async function (e) {
    e.preventDefault();
    const produto = document.getElementById('produto').value.trim();
    let categoria = document.getElementById('categoria').value;
    if (categoria === "nova") {
      categoria = document.getElementById('categoriaPersonalizada').value.trim();
    }
    const valor = parseFloat(document.getElementById('valor').value);
    const tipo = document.getElementById('tipo').value;
    if (!produto || !categoria || isNaN(valor)) return;
    await salvarTransacao(produto, categoria, valor, tipo);
    document.getElementById('produto').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('categoriaPersonalizada').value = '';
    document.getElementById('categoriaPersonalizada').style.display = 'none';
    document.getElementById('valor').value = '';
    await atualizarTudo();
  };
}

window.removerTransacaoConfirm = async function(id) {
  if (confirm('Deseja remover esta transação?')) {
    await excluirTransacao(id);
    await atualizarTudo();
  }
}

// Calculadora de preço de venda
const formCalc = document.getElementById('formCalc');
if (formCalc) {
  formCalc.onsubmit = function(e) {
    e.preventDefault();
    const custo = parseFloat(document.getElementById('calcCusto').value) || 0;
    const imposto = parseFloat(document.getElementById('calcImposto').value) || 0;
    const taxa = parseFloat(document.getElementById('calcTaxa').value) || 0;
    const frete = parseFloat(document.getElementById('calcFrete').value) || 0;
    const lucro = parseFloat(document.getElementById('calcLucro').value) || 0;

    // Apenas CUSTO e LUCRO são obrigatórios
    if (!custo || !lucro) {
      document.getElementById('resultadoCalc').innerHTML = `<span style="color:#c10000"><b>Preencha o custo do produto e o lucro desejado.</b></span>`;
      return;
    }

    const custoTotal = custo + frete;
    const percTaxaImposto = (taxa + imposto) / 100;
    const percLucro = lucro / 100;

    let preco = 0;
    let mensagem = '';

    if (percTaxaImposto >= 1) {
      mensagem = `<span style="color:#c10000"><b>Percentual de taxas+imposto não pode ser igual ou maior que 100%!</b></span>`;
    } else {
      preco = (custoTotal * (1 + percLucro)) / (1 - percTaxaImposto);
      mensagem = `<b>Preço ideal de venda:</b> R$ ${preco.toFixed(2)}<br><small style="color:#777;">(Lucro sobre o custo: ${lucro}% )</small>`;
    }
    document.getElementById('resultadoCalc').innerHTML = mensagem;
  };
}

// Iniciar app
window.onload = function() {
  mostrarTela('dashboard');
  atualizarTudo();
};

