import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchHandler } from '../src/api/controllers/searchController.js';

vi.mock('../src/api/db.js', () => {
  const mockOpportunities = [
    {
      _id: '1',
      title: 'Frontend React Engineer Internship',
      description: 'Building modern interfaces with React and Tailwind',
      type: 'Internships',
      location: 'Remote',
      stipend: 'Paid',
      stipendAmount: 25000,
      salary: 25000,
      created_at: new Date('2026-01-01')
    },
    {
      _id: '2',
      title: 'Backend Node.js Developer',
      description: 'Express and MongoDB backend development',
      type: 'Jobs',
      location: 'Onsite - Bangalore',
      stipend: 'Paid',
      stipendAmount: 50000,
      salary: 50000,
      created_at: new Date('2026-01-05')
    },
    {
      _id: '3',
      title: 'Full Stack Hackathon 2026',
      description: 'Build AI apps and win prizes',
      type: 'Hackathons',
      location: 'Online',
      stipend: 'Unpaid',
      stipendAmount: 0,
      salary: 0,
      created_at: new Date('2026-01-10')
    },
    {
      _id: '4',
      title: 'AI Research Fellowship',
      description: 'Graduate student research in deep learning',
      type: 'Fellowships',
      location: 'Remote',
      stipend: 'Paid',
      stipendAmount: 40000,
      salary: 40000,
      created_at: new Date('2026-01-15')
    },
    {
      _id: '5',
      title: 'Global Tech Scholarship',
      description: 'Financial support for undergraduate engineers',
      type: 'Scholarships',
      location: 'Global',
      stipend: 'Paid',
      stipendAmount: 10000,
      salary: 10000,
      created_at: new Date('2026-01-20')
    }
  ];

  return {
    dbCommand: {},
    dbQuery: {
      collection: vi.fn().mockReturnValue({
        countDocuments: vi.fn().mockImplementation((filter: any) => {
          return Promise.resolve(mockOpportunities.length);
        }),
        find: vi.fn().mockImplementation((filter: any) => ({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockImplementation((skipNum: number) => ({
            limit: vi.fn().mockImplementation((limitNum: number) => ({
              toArray: vi.fn().mockResolvedValue(mockOpportunities.slice(skipNum, skipNum + limitNum))
            }))
          })),
          limit: vi.fn().mockImplementation((limitNum: number) => ({
            toArray: vi.fn().mockResolvedValue(mockOpportunities.slice(0, limitNum))
          }))
        }))
      })
    }
  };
});

describe('Search Controller Pagination & Filters', () => {
  let mockRes: any;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  it('should paginate results with page=1 and limit=2', async () => {
    const req = {
      query: {
        page: '1',
        limit: '2',
        sortBy: 'Recently added'
      }
    } as any;

    await searchHandler(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseData = mockRes.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.results).toHaveLength(2);
    expect(responseData.results[0].id).toBe('1');
    expect(responseData.results[1].id).toBe('2');
    expect(responseData.pagination).toEqual({
      page: 1,
      limit: 2,
      totalItems: 5,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false
    });
    expect(responseData.meta.total_found).toBe(5);
  });

  it('should navigate to page=2 and retrieve the next batch of items', async () => {
    const req = {
      query: {
        page: '2',
        limit: '2',
        sortBy: 'Recently added'
      }
    } as any;

    await searchHandler(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseData = mockRes.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.results).toHaveLength(2);
    expect(responseData.results[0].id).toBe('3');
    expect(responseData.results[1].id).toBe('4');
    expect(responseData.pagination.page).toBe(2);
    expect(responseData.pagination.hasNextPage).toBe(true);
    expect(responseData.pagination.hasPrevPage).toBe(true);
  });

  it('should handle last page correctly (page=3 with limit=2)', async () => {
    const req = {
      query: {
        page: '3',
        limit: '2'
      }
    } as any;

    await searchHandler(req, mockRes);

    const responseData = mockRes.json.mock.calls[0][0];
    expect(responseData.results).toHaveLength(1);
    expect(responseData.results[0].id).toBe('5');
    expect(responseData.pagination.hasNextPage).toBe(false);
    expect(responseData.pagination.hasPrevPage).toBe(true);
  });

  it('should handle search query and filter parameters correctly', async () => {
    const req = {
      query: {
        q: 'React',
        types: 'Internships',
        stipend: 'Paid',
        page: '1',
        limit: '10'
      }
    } as any;

    await searchHandler(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseData = mockRes.json.mock.calls[0][0];
    expect(responseData.meta.query).toBe('React');
    expect(responseData.pagination.page).toBe(1);
  });
});
