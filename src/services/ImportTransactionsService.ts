import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import { getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import UploadConfig from '../config/upload';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Params {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

async function loadCSV(filePath: string): Promise<any> {
  const readCSVStream = fs.createReadStream(filePath);

  const parseStream = csvParse({
    from_line: 1,
    ltrim: true,
    rtrim: true,
    columns: true,
  });

  const parseCSV = readCSVStream.pipe(parseStream);

  const lines: any[] = [];

  parseCSV.on('data', (line: any) => {
    lines.push(line);
  });

  await new Promise(resolve => {
    parseCSV.on('end', resolve);
  });

  return lines;
}

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const csvFilePath = path.resolve(UploadConfig.directory, filename);
    const data = await loadCSV(csvFilePath);

    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const categories = data.map((transaction: Params) => transaction.category);

    const existentCategories = await categoryRepository.find();
    const existentCategoriesTitles: string[] = existentCategories.map(
      (category: any) => category.title,
    );

    const addCategoriesTitles = categories
      .filter(
        (category: string) => !existentCategoriesTitles.includes(category),
      )
      .filter((value: any, index: any, self: any) => {
        return self.indexOf(value) === index;
      });

    const newCategories = categoryRepository.create(
      addCategoriesTitles.map((title: string) => ({
        title,
      })),
    );
    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      data.map(({ title, value, category, type }: Params) => ({
        title,
        value: +value,
        category: finalCategories.find(cat => cat.title === category),
        type,
      })),
    );

    await transactionRepository.save(createdTransactions);

    console.log(createdTransactions);
    fs.unlink(csvFilePath, err => console.log(err));
    return createdTransactions;
  }
}

export default ImportTransactionsService;
