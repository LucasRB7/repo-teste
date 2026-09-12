document.addEventListener('DOMContentLoaded', async () => {
  await garantirSeed();
  const sessao = exigirSessao('adm', 'login.html');
  if (!sessao) return;

  renderizarCabecalho({ tipo: 'adm', ativo: 'dashboard', nomeUsuario: sessao.nome });

  document.getElementById('total-clientes').textContent = RepoClientes.listar().length;
  document.getElementById('total-corretores').textContent = RepoCorretores.listar().length;
  document.getElementById('total-imoveis').textContent = RepoImoveis.listar().length;
});
