document.addEventListener('DOMContentLoaded', async () => {
  await garantirSeed();
  const sessao = exigirSessao('adm', 'login.html');
  if (!sessao) return;

  renderizarCabecalho({ tipo: 'adm', ativo: 'clientes', nomeUsuario: sessao.nome });

  const corpoTabela = document.getElementById('corpo-tabela-clientes');
  const estadoVazio = document.getElementById('estado-vazio-clientes');
  const overlay = document.getElementById('overlay-cliente');
  const form = document.getElementById('form-cliente');
  const tituloModal = document.getElementById('titulo-modal-cliente');
  const erroEl = document.getElementById('erro-cliente');
  const campoSenha = document.getElementById('cliente-senha');
  const ajudaSenha = document.getElementById('ajuda-senha-cliente');

  aplicarMascara(document.getElementById('cliente-telefone'), mascararTelefone);
  aplicarMascara(document.getElementById('cliente-cpf'), mascararCPF);

  function renderizarTabela() {
    const clientes = RepoClientes.listar();
    estadoVazio.hidden = clientes.length > 0;
    corpoTabela.innerHTML = clientes
      .map(
        (c) => `
        <tr>
          <td>${escapeHtml(c.nome)}</td>
          <td>${escapeHtml(c.telefone)}</td>
          <td>${escapeHtml(c.cpf)}</td>
          <td>${formatarData(c.dataNascimento)}</td>
          <td>${escapeHtml(c.email)}</td>
          <td class="tabela-acoes">
            <button class="btn btn-secundario btn-sm" data-editar="${c.id}" type="button">Editar</button>
            <button class="btn btn-perigo btn-sm" data-excluir="${c.id}" type="button">Excluir</button>
          </td>
        </tr>`
      )
      .join('');
  }

  function abrirParaNovo() {
    form.reset();
    document.getElementById('cliente-id').value = '';
    tituloModal.textContent = 'Novo cliente';
    erroEl.textContent = '';
    campoSenha.required = true;
    ajudaSenha.textContent = 'Mínimo de 6 caracteres.';
    abrirModal(overlay);
  }

  function abrirParaEdicao(id) {
    const cliente = RepoClientes.buscarPorId(id);
    if (!cliente) return;
    form.reset();
    document.getElementById('cliente-id').value = cliente.id;
    document.getElementById('cliente-nome').value = cliente.nome;
    document.getElementById('cliente-telefone').value = cliente.telefone;
    document.getElementById('cliente-cpf').value = cliente.cpf;
    document.getElementById('cliente-nascimento').value = cliente.dataNascimento;
    document.getElementById('cliente-email').value = cliente.email;
    tituloModal.textContent = 'Editar cliente';
    erroEl.textContent = '';
    campoSenha.required = false;
    ajudaSenha.textContent = 'Deixe em branco para manter a senha atual.';
    abrirModal(overlay);
  }

  document.getElementById('btn-novo-cliente').addEventListener('click', abrirParaNovo);
  document.getElementById('cancelar-cliente').addEventListener('click', () => fecharModal(overlay));
  document.getElementById('fechar-modal-cliente').addEventListener('click', () => fecharModal(overlay));
  overlay.addEventListener('click', (evento) => { if (evento.target === overlay) fecharModal(overlay); });

  corpoTabela.addEventListener('click', (evento) => {
    const idEditar = evento.target.getAttribute('data-editar');
    const idExcluir = evento.target.getAttribute('data-excluir');
    if (idEditar) abrirParaEdicao(idEditar);
    if (idExcluir) {
      const cliente = RepoClientes.buscarPorId(idExcluir);
      if (cliente && confirm(`Excluir o cliente "${cliente.nome}"?`)) {
        RepoClientes.remover(idExcluir);
        renderizarTabela();
        mostrarToast('Cliente excluído.');
      }
    }
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroEl.textContent = '';

    const id = document.getElementById('cliente-id').value;
    const nome = document.getElementById('cliente-nome').value.trim();
    const telefone = document.getElementById('cliente-telefone').value.trim();
    const cpf = document.getElementById('cliente-cpf').value.trim();
    const dataNascimento = document.getElementById('cliente-nascimento').value;
    const email = document.getElementById('cliente-email').value.trim();
    const senha = campoSenha.value;

    if (!nome || !telefone || !cpf || !dataNascimento || !email) {
      erroEl.textContent = 'Preencha todos os campos obrigatórios.';
      return;
    }
    if (!telefoneValido(telefone)) { erroEl.textContent = 'Telefone inválido.'; return; }
    if (!cpfValido(cpf)) { erroEl.textContent = 'CPF inválido.'; return; }
    if (!senha && !id) { erroEl.textContent = 'Informe uma senha para o novo cliente.'; return; }
    if (senha && senha.length < 6) { erroEl.textContent = 'A senha deve ter ao menos 6 caracteres.'; return; }

    const outrosClientes = RepoClientes.listar().filter((c) => String(c.id) !== String(id));
    const emailEmUso = emailJaExiste(email, [outrosClientes, RepoCorretores.listar()]);
    if (emailEmUso) { erroEl.textContent = 'Este e-mail já está em uso.'; return; }

    const dados = { nome, telefone, cpf, dataNascimento, email };
    if (senha) dados.senha = await hashSenha(senha);

    if (id) {
      RepoClientes.atualizar(id, dados);
      mostrarToast('Cliente atualizado.');
    } else {
      RepoClientes.inserir(dados);
      mostrarToast('Cliente cadastrado.');
    }

    fecharModal(overlay);
    renderizarTabela();
  });

  renderizarTabela();
});
