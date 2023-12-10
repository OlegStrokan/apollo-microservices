import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CreateParcelDeliveryInput } from '../app/use-cases/create-parcel-delivery/dto/create-parcel-delivery.input';
import { ParcelDeliveryEntity } from "../domain/entities/parcel-delivery";
import { ParcelDeliveryService } from "../app/use-cases/create-parcel-delivery";

@Resolver(() => ParcelDeliveryEntity)
export class ParcelDeliveryResolver {
  constructor(private readonly parcelDeliveryService: ParcelDeliveryService) {}

  @Mutation(() => ParcelDeliveryEntity)
  createParcelDelivery(@Args('createParcelDeliveryInput') createParcelDeliveryInput: CreateParcelDeliveryInput) {
    return this.parcelDeliveryService.create(createParcelDeliveryInput);
  }
}
