import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionsService, SessionListResponse } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';

@Controller('sessions')
@UseGuards(AuthGuard('jwt'))
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @Request() req: any,
  ) {
    const currentUserId = req.user.userId;
    return this.sessionsService.createSession(createSessionDto, currentUserId);
  }

  @Get()
  async getSessions(
    @Query() query: ListSessionsQueryDto,
  ): Promise<SessionListResponse> {
    return this.sessionsService.getSessions(query);
  }
}