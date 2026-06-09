// tests/test_exames_lab.js — TFG CKD-EPI 2021, estrutura, templates
const path = require('path');
const H = require('./helpers');
H.setupWindow();
const EL = require(path.join(H.ROOT, 'modules/exames-lab.js'));

H.section('Estrutura de categorias');
H.test('CATEGORIAS é array não-vazio', () => {
  H.assert(Array.isArray(EL.CATEGORIAS) && EL.CATEGORIAS.length >= 10, 'esperava 10+ categorias');
});
H.test('toda categoria tem id, titulo e campos', () => {
  for (const cat of EL.CATEGORIAS) {
    H.assert(cat.id && cat.titulo, 'categoria sem id/titulo: ' + JSON.stringify(cat).slice(0, 60));
    H.assert(Array.isArray(cat.campos) || cat.textoLivre, 'categoria sem campos: ' + cat.id);
  }
});
H.test('hemograma tem Hb com unidade g/dL', () => {
  const hemo = EL.CATEGORIAS.find(c => c.id === 'hemograma');
  const hb = hemo.campos.find(c => c.id === 'hb');
  H.assertEq(hb.unidade, 'g/dL');
});
H.test('glicemico tem hba1c', () => {
  const g = EL.CATEGORIAS.find(c => c.id === 'glicemico');
  H.assert(g.campos.some(c => c.id === 'hba1c'), 'sem hba1c');
});
H.test('renal tem creatinina com calcTfg', () => {
  const r = EL.CATEGORIAS.find(c => c.id === 'renal');
  const cr = r.campos.find(c => c.id === 'creatinina');
  H.assert(cr.calcTfg === true, 'creatinina sem flag calcTfg');
});

H.section('estruturaVazia');
H.test('gera objeto com todas as categorias', () => {
  const e = EL.estruturaVazia();
  H.assert(typeof e === 'object', 'não é objeto');
  H.assert('hemograma' in e || 'glicemico' in e, 'sem categorias');
});

H.section('calcularTFG (CKD-EPI 2021)');
H.test('homem 60a creat 1.0 → ~85-95', () => {
  const tfg = EL.calcularTFG(1.0, 60, 'Masculino');
  H.assert(tfg >= 80 && tfg <= 100, 'TFG fora do esperado: ' + tfg);
});
H.test('mulher 60a creat 1.0 → menor que homem mesma creat', () => {
  const tfgM = EL.calcularTFG(1.0, 60, 'Masculino');
  const tfgF = EL.calcularTFG(1.0, 60, 'Feminino');
  H.assert(tfgF < tfgM, 'mulher deveria ter TFG menor com mesma creatinina');
});
H.test('aceita sexo abreviado M/F', () => {
  const a = EL.calcularTFG(1.0, 60, 'M');
  const b = EL.calcularTFG(1.0, 60, 'Masculino');
  H.assertEq(a, b);
});
H.test('creatinina alta → TFG baixa', () => {
  const tfg = EL.calcularTFG(4.0, 70, 'Masculino');
  H.assert(tfg < 30, 'TFG deveria ser baixa: ' + tfg);
});
H.test('parâmetros inválidos → null', () => {
  H.assertEq(EL.calcularTFG(0, 60, 'M'), null);
  H.assertEq(EL.calcularTFG(1.0, 0, 'M'), null);
  H.assertEq(EL.calcularTFG(1.0, 60, ''), null);
});

H.section('classificarTFG (estágios DRC)');
H.test('TFG 95 → G1', () => H.assertEq(EL.classificarTFG(95).estagio, 'G1'));
H.test('TFG 75 → G2', () => H.assertEq(EL.classificarTFG(75).estagio, 'G2'));
H.test('TFG 50 → G3a', () => H.assertEq(EL.classificarTFG(50).estagio, 'G3a'));
H.test('TFG 35 → G3b', () => H.assertEq(EL.classificarTFG(35).estagio, 'G3b'));
H.test('TFG 20 → G4', () => H.assertEq(EL.classificarTFG(20).estagio, 'G4'));
H.test('TFG 10 → G5', () => H.assertEq(EL.classificarTFG(10).estagio, 'G5'));

H.section('idadeEmAnos');
H.test('calcula idade a partir de data de nascimento', () => {
  const ano = new Date().getFullYear();
  const idade = EL.idadeEmAnos((ano - 40) + '-01-01');
  H.assert(idade === 40 || idade === 39, 'idade incorreta: ' + idade);
});
H.test('data inválida → null/0', () => {
  const r = EL.idadeEmAnos('');
  H.assert(r === null || r === 0 || isNaN(r), 'esperava null/0 para data vazia');
});

H.section('Templates');
H.test('TEMPLATES é array com ids', () => {
  H.assert(Array.isArray(EL.TEMPLATES) && EL.TEMPLATES.length > 0, 'sem templates');
  H.assert(EL.TEMPLATES.every(t => t.id && t.nome), 'template sem id/nome');
});
H.test('rastreio_mfc_adulto existe', () => {
  H.assert(EL.TEMPLATES.some(t => t.id === 'rastreio_mfc_adulto'), 'template não encontrado');
});
H.test('aplicarTemplate marca campos ativos', () => {
  const base = EL.estruturaVazia();
  const r = EL.aplicarTemplate(base, 'rastreio_mfc_adulto');
  H.assert(r && r._ativos && r._ativos.length > 0, 'deveria marcar campos ativos');
});

H.run();
