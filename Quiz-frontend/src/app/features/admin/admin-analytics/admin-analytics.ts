import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexFill,
  ApexDataLabels,
  ApexGrid,
  ApexTooltip,
  ApexMarkers,
  ApexLegend
} from 'ng-apexcharts';

import { AdminApi } from '../../../services/admin-api';

interface AnalyticsKpi {
  label: string;
  value: string;
  note: string;
  icon: string;
  iconClass: string;
  trendClass: string;
}

interface DailyActivity {
  date: string;
  solo: number;
  multi: number;
}

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  fill: ApexFill;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  markers: ApexMarkers;
  legend: ApexLegend;
  colors: string[];
};

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './admin-analytics.html',
  styleUrl: './admin-analytics.css'
})
export class AdminAnalytics implements OnInit {
  selectedRange = '30';

  soloGames = 0;
  multiGames = 0;
  totalReviews = 0;
  activeRooms = 0;

  kpis: AnalyticsKpi[] = [];

  chartOptions: ChartOptions = this.buildChartOptions(
    ['No Data'],
    [0],
    [0]
  );

  constructor(
    private adminApi: AdminApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  changeRange(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.adminApi.getAnalytics(this.selectedRange).subscribe({
      next: (data: any) => {
        console.log('ANALYTICS DATA:', data);

        const solo = Number(data.soloGames || 0);
        const multi = Number(data.multiGames || 0);
        const totalGames = Number(data.totalResults || solo + multi);
        const reviews = Number(data.totalReviews || 0);

        this.soloGames = solo;
        this.multiGames = multi;
        this.totalReviews = reviews;
        this.activeRooms = Number(data.activeRooms || 0);

        this.kpis = [
          {
            label: 'Total Users',
            value: this.formatNumber(data.totalUsers || 0),
            note: this.getRangeLabel(),
            icon: 'group',
            iconClass: 'bg-primary-soft text-primary',
            trendClass: 'text-primary'
          },
          {
            label: 'Total Quizzes',
            value: this.formatNumber(data.totalQuizzes || 0),
            note: 'Created quiz content',
            icon: 'quiz',
            iconClass: 'bg-secondary-soft text-secondary',
            trendClass: 'text-primary'
          },
          {
            label: 'Total Results',
            value: this.formatNumber(totalGames),
            note: `${solo} solo / ${multi} multi`,
            icon: 'sports_esports',
            iconClass: 'bg-tertiary-soft text-tertiary',
            trendClass: 'text-tertiary'
          },
          {
            label: 'Reviews',
            value: this.formatNumber(reviews),
            note: 'Community feedback',
            icon: 'rate_review',
            iconClass: 'bg-primary-soft text-primary',
            trendClass: 'text-primary'
          }
        ];

        const dailyActivity = this.normalizeDailyActivity(data.dailyActivity || []);

        this.chartOptions = this.buildChartOptions(
          dailyActivity.map(item => item.date),
          dailyActivity.map(item => item.solo),
          dailyActivity.map(item => item.multi)
        );

        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Load analytics failed:', err);
        this.setFallbackData();
      }
    });
  }

  private normalizeDailyActivity(source: any[]): DailyActivity[] {
    if (!Array.isArray(source) || source.length === 0) {
      return [{ date: 'No Data', solo: 0, multi: 0 }];
    }

    return source.map((item: any) => ({
      date: this.formatChartDate(item.date || item.day || item.created_at || item.createdAt),
      solo: Number(item.solo || item.soloGames || 0),
      multi: Number(item.multi || item.multiGames || 0)
    }));
  }

  private formatChartDate(value: string): string {
    if (!value) return 'Unknown';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getRangeLabel(): string {
    if (this.selectedRange === 'today') return 'Today';
    if (this.selectedRange === '7') return 'Last 7 days';
    if (this.selectedRange === '30') return 'Last 30 days';
    return 'All time';
  }

  get totalGameCount(): number {
    return this.soloGames + this.multiGames + this.totalReviews + this.activeRooms;
  }

  get soloPercent(): number {
    return this.calcPercent(this.soloGames);
  }

  get multiPercent(): number {
    return this.calcPercent(this.multiGames);
  }

  get reviewPercent(): number {
    return this.calcPercent(this.totalReviews);
  }

  get activeRoomPercent(): number {
    return this.calcPercent(this.activeRooms);
  }

  private calcPercent(value: number): number {
    if (this.totalGameCount <= 0) return 8;
    return Math.max(8, Math.round((Number(value || 0) / this.totalGameCount) * 100));
  }

  private setFallbackData(): void {
    this.soloGames = 0;
    this.multiGames = 0;
    this.totalReviews = 0;
    this.activeRooms = 0;

    this.kpis = [
      {
        label: 'Total Users',
        value: '0',
        note: 'Backend unavailable',
        icon: 'group',
        iconClass: 'bg-primary-soft text-primary',
        trendClass: 'text-primary'
      },
      {
        label: 'Total Quizzes',
        value: '0',
        note: 'Backend unavailable',
        icon: 'quiz',
        iconClass: 'bg-secondary-soft text-secondary',
        trendClass: 'text-primary'
      },
      {
        label: 'Total Results',
        value: '0',
        note: 'Backend unavailable',
        icon: 'sports_esports',
        iconClass: 'bg-tertiary-soft text-tertiary',
        trendClass: 'text-tertiary'
      },
      {
        label: 'Reviews',
        value: '0',
        note: 'Backend unavailable',
        icon: 'rate_review',
        iconClass: 'bg-primary-soft text-primary',
        trendClass: 'text-primary'
      }
    ];

    this.chartOptions = this.buildChartOptions(['No Data'], [0], [0]);
    this.cdr.detectChanges();
  }

  private buildChartOptions(
    categories: string[],
    soloData: number[],
    multiData: number[]
  ): ChartOptions {
    const maxValue = Math.max(...soloData, ...multiData, 5);

    return {
      series: [
        { name: 'Solo Games', data: soloData },
        { name: 'Multi Games', data: multiData }
      ],

      chart: {
        type: 'area',
        height: 380,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: true, speed: 600 },
        fontFamily: 'Manrope, Arial, sans-serif',
        foreColor: '#68537c'
      },

      colors: ['#6e12f8', '#b30064'],

      stroke: {
        curve: 'smooth',
        width: [4, 4]
      },

      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.6,
          opacityFrom: 0.38,
          opacityTo: 0.04,
          stops: [0, 90, 100]
        }
      },

      dataLabels: { enabled: false },

      markers: {
        size: 4,
        strokeWidth: 3,
        strokeColors: '#ffffff',
        hover: { size: 7 }
      },

      grid: {
        borderColor: 'rgba(188, 164, 209, 0.24)',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
        padding: { left: 8, right: 8, top: 8, bottom: 0 }
      },

      xaxis: {
        categories,
        labels: {
          rotate: -25,
          trim: false,
          hideOverlappingLabels: true,
          style: {
            colors: '#8a78a0',
            fontSize: '11px',
            fontWeight: 700
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false }
      },

      yaxis: {
        min: 0,
        max: Math.ceil(maxValue * 1.25),
        tickAmount: 5,
        labels: {
          formatter: (value: number): string => `${Math.round(value)}`,
          style: {
            colors: '#8a78a0',
            fontSize: '12px',
            fontWeight: 700
          }
        }
      },

      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        theme: 'light',
        y: {
          formatter: (value: number): string => `${Math.round(value)} games`
        }
      },

      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontWeight: 800,
        labels: { colors: '#68537c' }
      }
    };
  }

  formatNumber(value: number): string {
    return Number(value || 0).toLocaleString();
  }
}