import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

@Injectable()
export class TmdbService {
  private readonly headers: { Authorization: string };

  constructor(private config: ConfigService) {
    this.headers = {
      Authorization: `Bearer ${this.config.get('TMDB_TOKEN')}`,
    };
  }

  async getPopularMovies(page = 1) {
    const { data } = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
      headers: this.headers,
      params: { language: 'fr-FR', page },
    });
    return data;
  }

  async getMovie(id: number) {
    const { data } = await axios.get(`${TMDB_BASE_URL}/movie/${id}`, {
      headers: this.headers,
      params: { language: 'fr-FR' },
    });
    return data;
  }

  async searchMovies(query: string) {
    const { data } = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      headers: this.headers,
      params: { query, language: 'fr-FR' },
    });
    return data;
  }
}
