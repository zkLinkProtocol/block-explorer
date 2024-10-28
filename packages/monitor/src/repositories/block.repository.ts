import { Injectable } from "@nestjs/common";
import { FindOptionsWhere, FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { Block } from "../entities";
import { UnitOfWork } from "../unitOfWork";

@Injectable()
export class BlockRepository {
  public constructor(private readonly unitOfWork: UnitOfWork) {}

  public async getLastBlock({
    where = {},
    select,
    relations,
  }: {
    where?: FindOptionsWhere<Block>;
    select?: FindOptionsSelect<Block>;
    relations?: FindOptionsRelations<Block>;
  } = {}): Promise<Block> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<Block>(Block, {
      where,
      select,
      order: { number: "DESC" },
      relations,
    });
  }
}
