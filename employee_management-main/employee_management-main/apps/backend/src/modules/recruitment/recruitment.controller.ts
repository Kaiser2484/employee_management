import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { RecruitmentService } from './recruitment.service';

@Controller('recruitment/candidates')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Roles(Role.Admin, Role.HR, Role.Manager)
  @Get()
  findAllCandidates() {
    return this.recruitmentService.findAllCandidates();
  }
}
