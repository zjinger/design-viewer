import { sm2 } from "sm-crypto";
const keypair = sm2.generateKeyPairHex(); // 生成密钥对
const publicKey = keypair.publicKey;
const privateKey = keypair.privateKey;
const encrypt = (data: string) => {
  const cipherText = sm2.doEncrypt(data, publicKey);
  return cipherText;
};
const decrypt = (cipherText: string) => {
  const plainText = sm2.doDecrypt(cipherText, privateKey);
  return plainText;
};
export const cryptoUtil = {
  encrypt,
  decrypt,
  getPrivateKey: () => {
    return privateKey;
  },
  getPublicKeyHex: () => {
    return publicKey;
  },
};
