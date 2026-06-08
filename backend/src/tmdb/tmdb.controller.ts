import { Controller, Get, Param, Query } from '@nestjs/common';
import { TmdbService } from './tmdb.service';

@Controller('tmdb')
export class TmdbController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get('movies/popular')
  getPopular(@Query('page') page = 1) {
    return this.tmdb.getPopularMovies(+page);
  }

  @Get('movies/search')
  search(@Query('q') query: string) {
    return this.tmdb.searchMovies(query);
  }

  @Get('movies/:id')
  getMovie(@Param('id') id: string) {
    return this.tmdb.getMovie(+id);
  }
}
