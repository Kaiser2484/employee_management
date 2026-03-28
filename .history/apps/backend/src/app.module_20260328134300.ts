import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { LeaveModule } from './modules/leave/leave.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { ProfileModule } from './modules/profile/profile.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    EmployeesModule,
    LeaveModule,
    RecruitmentModule,
    ProfileModule,
    TasksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
