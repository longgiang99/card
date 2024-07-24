import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Put,
    Delete,
    Query,
    UseGuards,
    HttpException,
    HttpStatus,
    Req,
} from '@nestjs/common';
import { getRepository } from 'typeorm';
import { AuthGuard, RequestWithAuthAccount } from 'src/guards/auth.guard';
import { AccountEntity } from '../account/account.entity';
import { Authentication } from 'src/decorators/Authentication';
import { ResponseDto } from 'src/shared/dto/responseDto';
import axios from 'axios';
import { AccountInfoService } from './account-info.service';
import { AccountInfoEntity } from './/account-info.entity';

@Controller('account-info-systems')
// @UseGuards(AuthGuard)
export class AccountInfoController {
    constructor(private readonly accountInfoService: AccountInfoService) {}

    @Get()
    findAll(): Promise<AccountInfoEntity[]> {
        return this.accountInfoService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<AccountInfoEntity> {
        return this.accountInfoService.findOne(id);
    }
}
