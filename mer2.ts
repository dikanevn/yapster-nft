import { Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";
import { MerkleTree } from "merkletreejs";

// Чтение адресов из файла "maddrs.json"
const addressesData = fs.readFileSync("maddrs.json", "utf8");
const addresses: string[] = JSON.parse(addressesData);
console.log(`Считано ${addresses.length} адресов из файла "maddrs.json"`);

// Вычисляем хеш для каждого адреса (как листья меркл-дерева) с использованием SHA256
const leaves: string[] = addresses.map((addr) =>
  crypto.createHash("sha256").update(new PublicKey(addr).toBuffer()).digest("hex")
);

// Сохраняем вычисленные хеши в формате JSON в файл "mleaves.json"
fs.writeFileSync("mleaves.json", JSON.stringify(leaves, null, 2));

// Преобразуем каждый хеш (hex-строку) в Buffer.
const leavesBuffers = leaves.map((leaf) => Buffer.from(leaf, "hex"));

// Сортируем листья (отсортировываем по возрастанию)
leavesBuffers.sort(Buffer.compare);

// Определяем функцию хеширования для меркл-дерева (SHA256)
const hashFn = (data: Buffer): Buffer =>
  crypto.createHash("sha256").update(data).digest();

// Создаем меркл-дерево с сортировкой пар при объединении (листья уже отсортированы)
const tree = new MerkleTree(leavesBuffers, hashFn, { sortPairs: true });

// Получаем корневой хеш меркл-дерева (Merkle root) в формате hex
const merkleRoot = tree.getRoot().toString("hex");

// Сохраняем корневой хеш в файл "merkleRoot"
fs.writeFileSync("merkleRoot", merkleRoot);

console.log(`Вычислено и сохранено ${addresses.length} хешей (листьев) в файл "mleaves.json"`);
console.log(`Корневой хеш меркл-дерева: ${merkleRoot}`); 