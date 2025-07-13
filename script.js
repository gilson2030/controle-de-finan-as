// ========== FIREBASE ==========
// Configuração (coloquei aqui, mas pode usar um arquivo separado firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyBt0DqN-zVUAtdRKLT9Evu1hlw8ykLxs_w",
  authDomain: "controle-rolli.firebaseapp.com",
  projectId: "controle-rolli",
  storageBucket: "controle-rolli.firebasestorage.app",
  messagingSenderId: "843955928588",
  appId: "1:843955928588:web:2e54bc5e35b414a0657829"
};
// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const COLLECTION = "transacoes";

// ========== FUNÇÕES DE INTERFACE ==========
function mostrarTela(tela) {
  document.querySelectorAll('.tela').forEach(el => el.style.display = 'none');
  document.getElementById(tela).style.display = 'block';
}

// ========== LÓGICA DE TRANSAÇÕES ==========
async function carregarTransacoes() {
  const snapshot = await db.collection(COLLECTION).orderBy('data', 'asc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function salvarTransacao(produto, valor, tipo) {
  await db.collection(COLLECTION).add({
    produto,
    valor,
    tipo,
    data: new Date().toISOString()
  });
}

async function excluirTransacao(id) {
  await db.collection(COLLECTION).doc(id).delete();
}

// ========== ATUALIZA TUDO ==========
let listaTransacoes = [];
let graficoRolli = null;

async function atualizarTudo() {
  listaTransacoes = await carregarTransacoes();

  // Painel de resumo
  let totalVendas = 0, totalCustos = 0, lucroLiquido = 0, lucroPorProduto = {};

  // Tabela transações
  const tbody = document.querySelector('#tabelaTransacoes tbody');
  tbody.innerHTML = '';
  listaTransacoes.forEach((t, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.produto}</td>
      <td>${t.tipo === 'venda' ? 'Venda' : 'Despesa'}</td>
      <td>${t.tipo === 'venda' ? '+' : '-'} R$ ${t.valor.toFixed(2)}</td>
      <td><button onclick="removerTransacaoConfirm('${t.id}')">🗑️</button></td>
    `;
    tbody.appendChild(tr);

    // Resumo
    if (t.tipo === 'venda') {
      totalVendas += t.valor;
      lucroPorProduto[t.produto] = (lucroPorProduto[t.produto] || 0) + t.valor;
    } else {
      totalCustos += t.valor;
      lucroPorProduto[t.produto] = (lucroPorProduto[t.produto] || 0) - t.valor;
    }
  });

  lucroLiquido = totalVendas - totalCustos;
  document.getElementById('lucroLiquido').textContent = 'R$ ' + lucroLiquido.toFixed(2);
  document.getElementById('totalVendas').textContent = 'R$ ' + totalVendas.toFixed(2);
  document.getElementById('totalCustos').textContent = 'R$ ' + totalCustos.toFixed(2);

  // Produtos mais lucrativos
  let arr = Object.entries(lucroPorProduto)
    .filter(([_, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const ul = document.getElementById('produtosLucrativos');
  ul.innerHTML = arr.length === 0 ? '<li>Nenhum produto lucrativo ainda.</li>' :
    arr.map(([p, v]) => `<li><b>${p}</b>: R$ ${v.toFixed(2)}</li>`).join('');

  atualizarGrafico();
}

// ========== GRÁFICO ==========
function atualizarGrafico() {
  // Agrupar vendas/despesas por mês
  const meses = {};
  listaTransacoes.forEach(t => {
    const d = new Date(t.data || new Date());
    const chave = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!meses[chave]) meses[chave] = { vendas: 0, despesas: 0 };
    if (t.tipo === 'venda') meses[chave].vendas += t.valor;
    else meses[chave].despesas += t.valor;
  });

  // Ordena meses
  const chaves = Object.keys(meses).sort();
  const vendasData = chaves.map(m => meses[m].vendas);
  const despesasData = chaves.map(m => meses[m].despesas);

  const options = {
    chart: { type: 'bar', height: 290, toolbar: { show: false } },
    series: [
      { name: 'Vendas', data: vendasData },
      { name: 'Despesas', data: despesasData }
    ],
    xaxis: {
      categories: chaves.map(c => {
        const [ano, mes] = c.split('-');
        return `${mes}/${ano.slice(-2)}`;
      })
    },
    colors: ['#7c39e6', '#ffc233'],
    plotOptions: { bar: { horizontal: false, borderRadius: 4 } },
    dataLabels: { enabled: false },
    legend: { position: 'top' }
  };

  if (!document.getElementById('graficoVendas')) return;
  if (graficoRolli) {
    graficoRolli.updateOptions(options);
  } else {
    graficoRolli = new ApexCharts(document.getElementById('graficoVendas'), options);
    graficoRolli.render();
  }
}

// ========== FORM ==========
document.getElementById('formTransacao').onsubmit = async function (e) {
  e.preventDefault();
  const produto = document.getElementById('produto').value.trim();
  const valor = parseFloat(document.getElementById('valor').value);
  const tipo = document.getElementById('tipo').value;
  if (!produto || isNaN(valor)) return;
  await salvarTransacao(produto, valor, tipo);
  document.getElementById('produto').value = '';
  document.getElementById('valor').value = '';
  await atualizarTudo();
};

async function removerTransacaoConfirm(id) {
  if (confirm('Deseja remover esta transação?')) {
    await excluirTransacao(id);
    await atualizarTudo();
    await atualizarTudo();
  }
}

// ========== INICIALIZA ==========
window.onload = atualizarTudo;

// Para alternar entre as telas mantendo responsividade e recarregando dashboard sempre que abrir
window.mostrarTela = async function(tela) {
  document.querySelectorAll('.tela').forEach(el => el.style.display = 'none');
  document.getElementById(tela).style.display = 'block';
  if (tela === 'dashboard') await atualizarTudo();
};

