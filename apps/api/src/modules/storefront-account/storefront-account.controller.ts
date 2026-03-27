import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../admin-auth/decorators/public.decorator';
import { CustomerSessionAuthGuard } from '../storefront-auth/guards/customer-session-auth.guard';
import { CurrentCustomer } from '../storefront-auth/decorators/current-customer.decorator';
import { StorefrontAccountService } from './storefront-account.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Public()
@UseGuards(CustomerSessionAuthGuard)
@Controller('public/account')
export class StorefrontAccountController {
  constructor(private readonly accountService: StorefrontAccountService) {}

  @Get('profile')
  getProfile(@CurrentCustomer() customer: { id: string }) {
    return this.accountService.getProfile(customer.id);
  }

  @Put('profile')
  updateProfile(
    @CurrentCustomer() customer: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.accountService.updateProfile(customer.id, dto);
  }

  @Get('addresses')
  listAddresses(@CurrentCustomer() customer: { id: string }) {
    return this.accountService.listAddresses(customer.id);
  }

  @Post('addresses')
  createAddress(
    @CurrentCustomer() customer: { id: string },
    @Body() dto: CreateAddressDto,
  ) {
    return this.accountService.createAddress(customer.id, dto);
  }

  @Put('addresses/:id')
  updateAddress(
    @CurrentCustomer() customer: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.accountService.updateAddress(customer.id, id, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(
    @CurrentCustomer() customer: { id: string },
    @Param('id') id: string,
  ) {
    return this.accountService.deleteAddress(customer.id, id);
  }

  @Post('addresses/:id/set-default')
  setDefaultAddress(
    @CurrentCustomer() customer: { id: string },
    @Param('id') id: string,
  ) {
    return this.accountService.setDefaultAddress(customer.id, id);
  }

  @Get('orders')
  listOrders(@CurrentCustomer() customer: { id: string }) {
    return this.accountService.listOrders(customer.id);
  }

  @Get('orders/:orderNo')
  getOrder(
    @CurrentCustomer() customer: { id: string },
    @Param('orderNo') orderNo: string,
  ) {
    return this.accountService.getOrder(customer.id, orderNo);
  }
}
