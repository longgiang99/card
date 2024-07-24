import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountInfoEntity } from './account-info.entity';
import { AccountInfoService } from './account-info.service';
import { AccountInfoController } from './account-info.controller';

@Module({
    imports: [TypeOrmModule.forFeature([AccountInfoEntity])],
    providers: [AccountInfoService],
    controllers: [AccountInfoController],
    exports: [AccountInfoService],
})
export class AccountInfoModule {}
