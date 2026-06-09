// tests/test_crypto.js — cifragem, vault, recuperação
const path = require('path');
const H = require('./helpers');
H.setupWindow();
const CryptoModule = require(path.join(H.ROOT, 'modules/crypto.js'));

let vault, dek, recoveryKey;

H.section('Vault: criação');
H.test('createVault devolve metadata + dek + recoveryKey', async () => {
  const r = await CryptoModule.createVault('minha-senha-forte-123');
  vault = r.vaultMetadata; dek = r.dek; recoveryKey = r.recoveryKey;
  H.assert(vault && vault.version === 1, 'metadata inválida');
  H.assert(dek, 'sem DEK');
  H.assert(recoveryKey && recoveryKey.length > 0, 'sem recoveryKey');
});

H.test('metadata contém salts e wraps independentes', () => {
  H.assert(vault.saltPassword && vault.saltRecovery, 'faltam salts');
  H.assert(vault.saltPassword !== vault.saltRecovery, 'salts deveriam diferir');
  H.assert(vault.wrappedByPassword && vault.wrappedByRecovery, 'faltam wraps');
});

H.test('recoveryKey é formatada (grupos com hífen)', () => {
  H.assertIncludes(recoveryKey, '-');
});

H.section('Vault: desbloqueio');
H.test('unlockWithPassword com senha correta devolve DEK', async () => {
  const d = await CryptoModule.unlockWithPassword(vault, 'minha-senha-forte-123');
  H.assert(d, 'não desbloqueou');
});

H.test('unlockWithPassword com senha errada lança', async () => {
  await H.assertRejects(() => CryptoModule.unlockWithPassword(vault, 'senha-errada'));
});

H.test('unlockWithRecovery com chave correta devolve DEK', async () => {
  const d = await CryptoModule.unlockWithRecovery(vault, recoveryKey);
  H.assert(d, 'não desbloqueou via recovery');
});

H.test('unlockWithRecovery tolera espaços/maiúsculas', async () => {
  const variante = recoveryKey.toLowerCase().replace(/-/g, ' ');
  const d = await CryptoModule.unlockWithRecovery(vault, variante);
  H.assert(d, 'deveria normalizar e aceitar');
});

H.test('unlockWithRecovery com chave inválida lança', async () => {
  await H.assertRejects(() => CryptoModule.unlockWithRecovery(vault, 'AAAA-BBBB-CCCC-DDDD'));
});

H.section('Cifragem de objetos');
H.test('encrypt → decrypt preserva objeto', async () => {
  const obj = { nome: 'Teste', idade: 42, lista: [1, 2, 3], aninhado: { a: true } };
  const ct = await CryptoModule.encrypt(dek, obj);
  const pt = await CryptoModule.decrypt(dek, ct);
  H.assertDeep(pt, obj);
});

H.test('encrypt preserva caracteres PT-BR (acentos)', async () => {
  const obj = { texto: 'Avaliação de hipertensão à beira-leito — ção, ã, é, ô' };
  const ct = await CryptoModule.encrypt(dek, obj);
  const pt = await CryptoModule.decrypt(dek, ct);
  H.assertEq(pt.texto, obj.texto);
});

H.test('ciphertext difere a cada cifragem (IV aleatório)', async () => {
  const obj = { x: 1 };
  const a = await CryptoModule.encrypt(dek, obj);
  const b = await CryptoModule.encrypt(dek, obj);
  H.assert(JSON.stringify(a) !== JSON.stringify(b), 'IV deveria variar');
});

H.test('decrypt com DEK errada lança', async () => {
  const ct = await CryptoModule.encrypt(dek, { x: 1 });
  const { dek: outraDek } = await CryptoModule.createVault('outra-senha-999');
  await H.assertRejects(() => CryptoModule.decrypt(outraDek, ct));
});

H.section('Cifragem de bytes (anexos)');
H.test('encryptBytes → decryptBytes preserva binário', async () => {
  const bytes = new Uint8Array([0, 1, 2, 255, 128, 64, 32]);
  const ct = await CryptoModule.encryptBytes(dek, bytes);
  const pt = await CryptoModule.decryptBytes(dek, ct);
  H.assertEq(pt.length, bytes.length);
  for (let i = 0; i < bytes.length; i++) H.assertEq(pt[i], bytes[i], 'byte ' + i);
});

H.section('Troca de senha');
H.test('changePassword re-embrulha; nova senha funciona, antiga não', async () => {
  const novoVault = await CryptoModule.changePassword(vault, dek, 'senha-nova-456');
  const d = await CryptoModule.unlockWithPassword(novoVault, 'senha-nova-456');
  H.assert(d, 'nova senha deveria funcionar');
  await H.assertRejects(() => CryptoModule.unlockWithPassword(novoVault, 'minha-senha-forte-123'));
});

H.test('changePassword preserva acesso via recovery', async () => {
  const novoVault = await CryptoModule.changePassword(vault, dek, 'senha-nova-789');
  const d = await CryptoModule.unlockWithRecovery(novoVault, recoveryKey);
  H.assert(d, 'recovery deveria continuar funcionando');
});

H.section('Hash cego (busca por nome)');
H.test('blindHash é determinístico para mesmo texto+salt', async () => {
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const a = await CryptoModule.blindHash('Maria Silva', salt);
  const b = await CryptoModule.blindHash('Maria Silva', salt);
  H.assertEq(a, b);
});

H.test('blindHash difere para textos diferentes', async () => {
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const a = await CryptoModule.blindHash('Maria', salt);
  const b = await CryptoModule.blindHash('João', salt);
  H.assert(a !== b, 'hashes deveriam diferir');
});

H.run();
