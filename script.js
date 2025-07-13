// ========== VARIÁVEIS ==========
let transacoes = JSON.parse(localStorage.getItem('rolliTransacoes') || '[]');

// ========== TELA ==========
function mostrarTela(tela) {
  document.querySelectorAll('.tela').forEach(el => el.style.display = 'none');
  document.getElementById(tela).style.display = 'block';
}

// ========== ADICIONAR TRANSAÇÃO ==========
document.getElementById('formTransacao').onsubmit = function (e) {
  e.preventDefault();
  const produto = document.getElementById('produto').value.trim();
  const valor = parseFloat(document.getElementById('valor').value);
  const tipo = document.getElementById('tipo').value;
  if (!produto || isNaN(valor)) return;

  transacoes.push({ produto, valor, tipo });
  localStorage.setItem('rolliTransacoes', JSON.stringify(transacoes));
  document.getElementById('produto').value = '';
  document.getElementById('valor').value = '';
  atualizarTudo();
};

// ========== REMOVER TRANSAÇÃO ==========
function removerTransacao(index) {
  if (confirm('Deseja remover esta transação?')) {
    transacoes.splice(index, 1);
    localStorage.setItem('rolliTransacoes', JSON.stringify(transacoes));
    atualizarTudo();
  }
}

// ========== ATUALIZAR TABELA E PAINEL ==========
function atualizarTudo() {
  // Resumo
  let totalVendas = 0, totalCustos = 0;
  let lucroLiquido = 0;
  let lucroPorProduto = {};

  // Tabela transações
  const tbody = document.querySelector('#tabelaTransacoes tbody');
  tbody.innerHTML = '';
  transacoes.forEach((t, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.produto}</td>
      <td>${t.tipo === 'venda' ? 'Venda' : 'Despesa'}</td>
      <td>${t.tipo === 'venda' ? '+' : '-'} R$ ${t.valor.toFixed(2)}</td>
      <td><button onclick="removerTransacao(${i})">🗑️</button></td>
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
}

// ========== INICIALIZA ==========
atualizarTudo();
