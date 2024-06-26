import {Injectable} from "@nestjs/common";
import {InjectEntityManager, InjectRepository} from "@nestjs/typeorm";
import {EntityManager, Repository} from "typeorm";
import {IParcelDeliveryRepository} from "../../../core/repositories/parcel-delivery";
import {ParcelDeliveryEntity} from "../../entities/parcel-delivery";
import {CreateParcelDeliveryDto} from "../../../core/use-cases/create-parcel-delivery/dto/create-parcel-delivery.dto";
import {ParcelDelivery} from "../../../core/entities/parcel-delivery";

@Injectable()
export class ParcelDeliveryRepository implements IParcelDeliveryRepository {
  constructor(
    @InjectRepository(ParcelDeliveryEntity)
    private readonly repository: Repository<ParcelDeliveryEntity>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,

  ) {}

  async upsertOne(dto: CreateParcelDeliveryDto): Promise<ParcelDeliveryEntity> {
    const parcel  = ParcelDelivery.create(dto)
    const parcelDelivery = this.repository.create(parcel.data);
    return await this.repository.save(parcelDelivery)
  }

  async upsertMany(dto: CreateParcelDeliveryDto[]): Promise<ParcelDeliveryEntity[]> {
    return await this.entityManager.transaction(async (transactionManager) => {
      try {
      const parcelDeliveries = dto.map((parcel) =>
          transactionManager.create(ParcelDeliveryEntity, parcel) as ParcelDeliveryEntity
      );
        return await Promise.all(parcelDeliveries.map((parcel) => transactionManager.save(parcel)));
        } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    });
  }

  async findOneById(id: ParcelDeliveryEntity['id']): Promise<ParcelDeliveryEntity | null> {
    return await this.repository.findOneBy({ id })
  }

  async findByParcelNumber(parcelNumber: ParcelDeliveryEntity['parcelNumber']): Promise<ParcelDeliveryEntity | null> {
    return await this.repository.findOneBy({ parcelNumber })


  }

  async findAll(): Promise<ParcelDeliveryEntity[]> {
    return await this.repository.find()
  }

  public async clear(): Promise<void> {
    await this.repository.clear()
  }
}

