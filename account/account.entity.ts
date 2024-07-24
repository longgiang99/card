import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    Tree,
    TreeChildren,
    TreeParent,
    UpdateDateColumn,
} from 'typeorm';
import { AccountInfoEntity } from '../account-info/account-info.entity';
import { AgencyEntity } from '../agency/agency.entity';
import { ResumeEntity } from '../resume/resume.entity';
import { VendorEntity } from '../vendor/vendor.entity';
import { Journey } from '../journeys/journeys.entity';
import { CardEntity } from '../card/card.entity';

@Entity('account')
@Tree('materialized-path')
export class AccountEntity extends BaseEntity {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({
        type: 'uuid',
        nullable: false,
    })
    public ory_id: string;

    @Column({
        default: false,
    })
    is_root: boolean;

    @Column({
        nullable: false,
    })
    email: string;

    @Column({
        nullable: true,
    })
    token: string;

    @Column({
        nullable: true,
    })
    referer_id: number;

    @Column({
        nullable: true,
    })
    account_info_id: number;

    @OneToOne(() => AccountInfoEntity, (account_info) => account_info.account)
    @JoinColumn({
        name: 'account_info_id',
    })
    account_info: AccountInfoEntity;

    //NOTE HIEU ADD CARD ID
    @Column({
        nullable: true,
    })
    card_id: number;

    @OneToOne(() => CardEntity, (card) => card.account)
    @JoinColumn({
        name: 'card_id',
    })
    card: CardEntity;

    @OneToOne(() => ResumeEntity, (resume) => resume.account)
    resume: ResumeEntity;

    @OneToOne(() => AgencyEntity, (agency) => agency.account)
    agency: AgencyEntity;

    //NOTE mpath ex: 81.29.293.343.2233
    @TreeParent() //MARK xác định cột trong bảng đại diện cho cha (parent) của một node trong cây
    referer: AccountEntity; //referer id ng giới thiệu chính

    @OneToMany((type) => AccountEntity, (account) => account.referer)
    @TreeChildren() //MARK để xác định cột trong bảng đại diện cho tất cả các con (children) của một node trong cây
    referee: AccountEntity[]; //bảng

    @CreateDateColumn({
        type: 'timestamp with time zone',
        // default: () => 'CURRENT_TIMESTAMP(6)',
    })
    public created_at: Date;

    @UpdateDateColumn({
        type: 'timestamp with time zone',
        // default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)',
    })
    public updated_at: Date;
    journeys: any;
}
