import { Injectable } from '@nestjs/common';

@Injectable()
export class RecruitmentService {
  findAllCandidates() {
    return {
      data: [],
      message: 'Recruitment candidates placeholder',
    };
  }
}
