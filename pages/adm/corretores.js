const FOTO_PADRAO_CORRETOR = '../../src/img_corretor/foto1.svg';

document.addEventListener('DOMContentLoaded', async () => {
  await garantirSeed();
  const sessao = exigirSessao('adm', 'login.html');
  if (!sessao) return;

  renderizarCabecalho({ tipo: 'adm', ativo: 'corretores', nomeUsuario: sessao.nome });

  const corpoTabela = document.getElementById('corpo-tabela-corretores');
  const estadoVazio = document.getElementById('estado-vazio-corretores');
  const overlay = document.getElementById('overlay-corretor');
  const form = document.getElementById('form-corretor');
  const tituloModal = document.getElementById('titulo-modal-corretor');
  const erroEl = document.getElementById('erro-corretor');
  const campoSenha = document.getElementById('corretor-senha');
  const ajudaSenha = document.getElementById('ajuda-senha-corretor');
  const inputFoto = document.getElementById('corretor-foto');
  const previewFoto = document.getElementById('preview-foto-corretor');

  aplicarMascara(document.getElementById('corretor-telefone'), mascararTelefone);
  aplicarMascara(document.getElementById('corretor-cpf'), mascararCPF);
  aplicarMascara(document.getElementById('corretor-creci'), mascararCRECI);

  let fotoAtualBase64 = '';

  function resolverFoto(caminho) {
    if (!caminho) return FOTO_PADRAO_CORRETOR;
    if (caminho.startsWith('data:')) return caminho;
    return `../../${caminho}`;
  }

  inputFoto.addEventListener('change', async () => {
    const arquivo = inputFoto.files[0];
    if (!arquivo) return;
    fotoAtualBase64 = await arquivoParaBase64(arquivo);
    previewFoto.src = fotoAtualBase64;
  });

  function renderizarTabela() {
    const corretores = RepoCorretores.listar();
    estadoVazio.hidden = corretores.length > 0;
    corpoTabela.innerHTML = corretores
      .map(
        (c) => `
        <tr>
          <td><img class="avatar" src="${resolverFoto(c.foto)}" alt="Foto de ${escapeHtml(c.nome)}" /></td>
          <td>${escapeHtml(c.nome)}</td>
          <td>${escapeHtml(c.telefone)}</td>
          <td>${escapeHtml(c.cpf)}</td>
          <td>${escapeHtml(c.creci)}</td>
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
    document.getElementById('corretor-id').value = '';
    fotoAtualBase64 = '';
    previewFoto.src = FOTO_PADRAO_CORRETOR;
    tituloModal.textContent = 'Novo corretor';
    erroEl.textContent = '';
    campoSenha.required = true;
    ajudaSenha.textContent = 'Mínimo de 6 caracteres.';
    abrirModal(overlay);
  }

  function abrirParaEdicao(id) {
    const corretor = RepoCorretores.buscarPorId(id);
    if (!corretor) return;
    form.reset();
    document.getElementById('corretor-id').value = corretor.id;
    document.getElementById('corretor-nome').value = corretor.nome;
    document.getElementById('corretor-telefone').value = corretor.telefone;
    document.getElementById('corretor-cpf').value = corretor.cpf;
    document.getElementById('corretor-nascimento').value = corretor.dataNascimento;
    document.getElementById('corretor-creci').value = corretor.creci;
    document.getElementById('corretor-email').value = corretor.email;
    fotoAtualBase64 = corretor.foto || '';
    previewFoto.src = resolverFoto(corretor.foto);
    tituloModal.textContent = 'Editar corretor';
    erroEl.textContent = '';
    campoSenha.required = false;
    ajudaSenha.textContent = 'Deixe em branco para manter a senha atual.';
    abrirModal(overlay);
  }

  document.getElementById('btn-novo-corretor').addEventListener('click', abrirParaNovo);
  document.getElementById('cancelar-corretor').addEventListener('click', () => fecharModal(overlay));
  document.getElementById('fechar-modal-corretor').addEventListener('click', () => fecharModal(overlay));
  overlay.addEventListener('click', (evento) => { if (evento.target === overlay) fecharModal(overlay); });

  corpoTabela.addEventListener('click', (evento) => {
    const idEditar = evento.target.getAttribute('data-editar');
    const idExcluir = evento.target.getAttribute('data-excluir');
    if (idEditar) abrirParaEdicao(idEditar);
    if (idExcluir) {
      const corretor = RepoCorretores.buscarPorId(idExcluir);
      if (corretor && confirm(`Excluir o corretor "${corretor.nome}"?`)) {
        RepoCorretores.remover(idExcluir);
        renderizarTabela();
        mostrarToast('Corretor excluído.');
      }
    }
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroEl.textContent = '';

    const id = document.getElementById('corretor-id').value;
    const nome = document.getElementById('corretor-nome').value.trim();
    const telefone = document.getElementById('corretor-telefone').value.trim();
    const cpf = document.getElementById('corretor-cpf').value.trim();
    const dataNascimento = document.getElementById('corretor-nascimento').value;
    const creci = document.getElementById('corretor-creci').value.trim();
    const email = document.getElementById('corretor-email').value.trim();
    const senha = campoSenha.value;

    if (!nome || !telefone || !cpf || !dataNascimento || !creci || !email) {
      erroEl.textContent = 'Preencha todos os campos obrigatórios.';
      return;
    }
    if (!telefoneValido(telefone)) { erroEl.textContent = 'Telefone inválido.'; return; }
    if (!cpfValido(cpf)) { erroEl.textContent = 'CPF inválido.'; return; }
    if (!creciValido(creci)) { erroEl.textContent = 'CRECI inválido. Use o formato 000000-UF.'; return; }
    if (!senha && !id) { erroEl.textContent = 'Informe uma senha para o novo corretor.'; return; }
    if (senha && senha.length < 6) { erroEl.textContent = 'A senha deve ter ao menos 6 caracteres.'; return; }

    const outrosCorretores = RepoCorretores.listar().filter((c) => String(c.id) !== String(id));
    const emailEmUso = emailJaExiste(email, [outrosCorretores, RepoClientes.listar()]);
    if (emailEmUso) { erroEl.textContent = 'Este e-mail já está em uso.'; return; }

    const dados = {
      nome, telefone, cpf, dataNascimento, creci, email,
      foto: fotoAtualBase64 || (id ? RepoCorretores.buscarPorId(id).foto : 'src/img_corretor/foto1.svg')
    };
    if (senha) dados.senha = await hashSenha(senha);

    if (id) {
      RepoCorretores.atualizar(id, dados);
      mostrarToast('Corretor atualizado.');
    } else {
      RepoCorretores.inserir(dados);
      mostrarToast('Corretor cadastrado.');
    }

    fecharModal(overlay);
    renderizarTabela();
  });

  renderizarTabela();
});
