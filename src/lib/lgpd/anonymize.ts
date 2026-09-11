// Valores de anonimizacao (PUROS). Substituem dados pessoais preservando as
// chaves/relacionamentos (para nao quebrar integridade de registros retidos).
export function anonymizedCustomerFields() {
  return { name: "Anonimizado (LGPD)", document: null, email: null, phone: null, addressLine: null, notes: null };
}
export function anonymizedSupplierFields() {
  return { name: "Anonimizado (LGPD)", document: null, email: null, phone: null, addressLine: null, notes: null };
}
export function anonymizedUserFields(userId: string) {
  // email unico e "invalido" para preservar a constraint e travar o login.
  return { name: "Usuario removido", email: `removido+${userId}@lgpd.local`, active: false };
}
