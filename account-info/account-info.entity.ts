import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { AccountEntity } from '../account/account.entity';

@Entity('account_info')
export class AccountInfoEntity extends BaseEntity {
    @PrimaryGeneratedColumn()
    public id: number;

    @OneToOne(() => AccountEntity, (account) => account.account_info)
    // @JoinColumn({
    //     name: 'account_id',
    // })
    account: AccountEntity;

    @Column({
        nullable: true,
    })
    name: string;

    @Column({
        nullable: true,
    })
    phone: string;

    @Column({
        nullable: true,
    })
    description: string;

    @Column({
        nullable: true,
    })
    email: string;

    @Column({
        nullable: true,
    })
    avatar: string;

    @Column({
        nullable: true,
    })
    facebook: string;

    @Column({
        nullable: true,
    })
    zalo: string;

    @Column({
        nullable: true,
    })
    slide_text: string;

    @Column({
        nullable: true,
    })
    website: string;

    @Column({
        nullable: true,
    })
    bank_name: string;

    @Column({
        nullable: true,
    })
    bank_number: string;

    @CreateDateColumn({
        type: 'timestamp with time zone',
        default: () => 'CURRENT_TIMESTAMP(6)',
    })
    public created_at: Date;

    @UpdateDateColumn({
        type: 'timestamp with time zone',
        // default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)',
    })
    public updated_at: Date;
}
