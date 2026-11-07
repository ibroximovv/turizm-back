import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  type Type,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import type { PaginatedResponse } from '@nestjs-template/types';
import { ApiPaginatedResponse } from '../dto/paginated-response.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { createValidationPipe } from '../pipes/validation';
import type { BaseService } from './base.service';
import type { EntityId } from './crud-repository.interface';

export interface CrudControllerOptions<TCreate, TUpdate> {
  /** Singular name for Swagger summaries, e.g. "tour". */
  name: string;
  createDto: Type<TCreate>;
  updateDto: Type<TUpdate>;
  /** Swagger model of the response (class with @ApiProperty). */
  responseDto: Type<unknown>;
  /** Route param type. `int` -> ParseIntPipe, `uuid` -> ParseUUIDPipe. Default `int`. */
  idType?: 'int' | 'uuid';
}

/**
 * Builds an abstract controller with the standard CRUD routes:
 * `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` (204).
 *
 * The route path comes from `src/router/index.ts`, so the feature controller uses `@Controller()`:
 *
 * ```ts
 * @ApiTags('tours')
 * @Controller()
 * export class ToursController extends createCrudController({
 *   name: 'tour', createDto: CreateTourDto, updateDto: UpdateTourDto, responseDto: TourDto,
 * }) {
 *   constructor(protected readonly service: ToursService) { super(); }
 * }
 * ```
 *
 * Body DTOs are validated with an explicit `expectedType` because generic parameters
 * lose their runtime type metadata.
 */
export function createCrudController<
  TCreate,
  TUpdate,
  TResponse,
  TId extends EntityId = number,
>(options: CrudControllerOptions<TCreate, TUpdate>) {
  const { name, createDto, updateDto, responseDto, idType = 'int' } = options;
  const idPipe = idType === 'uuid' ? new ParseUUIDPipe() : new ParseIntPipe();
  const idParam = ApiParam({ name: 'id', type: idType === 'uuid' ? String : Number });

  abstract class CrudController {
    protected abstract readonly service: BaseService<unknown, TCreate, TUpdate, TResponse, TId>;

    @Get()
    @ApiOperation({ summary: `List ${name}s` })
    @ApiPaginatedResponse(responseDto)
    findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<TResponse>> {
      return this.service.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: `Get a ${name} by id` })
    @idParam
    @ApiOkResponse({ type: responseDto })
    @ApiNotFoundResponse()
    findOne(@Param('id', idPipe) id: TId): Promise<TResponse> {
      return this.service.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: `Create a ${name}` })
    @ApiBody({ type: createDto })
    @ApiCreatedResponse({ type: responseDto })
    @ApiBadRequestResponse()
    create(@Body(createValidationPipe({ expectedType: createDto })) dto: TCreate): Promise<TResponse> {
      return this.service.create(dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: `Update a ${name}` })
    @idParam
    @ApiBody({ type: updateDto })
    @ApiOkResponse({ type: responseDto })
    @ApiNotFoundResponse()
    update(
      @Param('id', idPipe) id: TId,
      @Body(createValidationPipe({ expectedType: updateDto })) dto: TUpdate,
    ): Promise<TResponse> {
      return this.service.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: `Delete a ${name}` })
    @idParam
    @ApiNoContentResponse()
    @ApiNotFoundResponse()
    remove(@Param('id', idPipe) id: TId): Promise<void> {
      return this.service.remove(id);
    }
  }

  return CrudController;
}
