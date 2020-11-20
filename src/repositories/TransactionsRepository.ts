import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    // TODO
    const transactions = await this.find();

    const balance: Balance = transactions.reduce(
      (acc: Balance, transaction: Transaction): Balance => {
        switch (transaction.type) {
          case 'income':
            acc.income += +transaction.value;
            break;
          case 'outcome':
            acc.outcome += +transaction.value;
            break;
          default:
            break;
        }
        return acc;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
    const total = balance.income - balance.outcome;
    return {
      total,
      outcome: balance.outcome,
      income: balance.income,
    };
  }
}

export default TransactionsRepository;
