import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PackagesService, PackageListResponse } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { ListPackagesQueryDto } from './dto/list-packages-query.dto';
import { DashboardPackageQueryDto } from './dto/dashboard-package-query.dto';
import { ClosePackageDto } from './dto/close-package.dto';

@Controller('packages')
@UseGuards(AuthGuard('jwt'))
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  async createPackage(
    @Body() createPackageDto: CreatePackageDto,
    @Request() req: any,
  ) {
    const currentUserId = req.user.userId;
    return this.packagesService.createPackage(createPackageDto, currentUserId);
  }

  @Get()
  async getPackages(
    @Query() query: ListPackagesQueryDto,
  ): Promise<PackageListResponse> {
    return this.packagesService.getPackages(query);
  }

   @Patch(':id/close')
async closePackage(
  @Param('id', ParseUUIDPipe) packageId: string,
  @Body() dto: ClosePackageDto,
) {
  return this.packagesService.closePackage(
    packageId, 
    dto.status,
    dto.remark,
  );
}

@Get('/dashboard')
async getDashboardPackages(
  @Query() query: DashboardPackageQueryDto,
) {
  return this.packagesService.getDashboardPackages(query);
}


}