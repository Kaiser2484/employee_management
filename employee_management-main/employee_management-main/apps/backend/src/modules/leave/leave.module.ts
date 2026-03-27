import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

@Module({
  imports: [AccessModule],
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
