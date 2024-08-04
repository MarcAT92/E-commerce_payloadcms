'use client'

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import qs from 'qs'

import type { Product } from '../../../payload/payload-types'
import type { ArchiveBlockProps } from '../../_blocks/ArchiveBlock/types'
import { Card } from '../Card'
import { PageRange } from '../PageRange'
import { Pagination } from '../Pagination'

import classes from './index.module.scss'
import { useFilter } from '../../_providers/Filter'

type Result = {
  docs: (Product | string)[]
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number
  page: number
  prevPage: number
  totalDocs: number
  totalPages: number
}

export type Props = {
  categories?: ArchiveBlockProps['categories']
  className?: string
  limit?: number
  onResultChange?: (result: Result) => void
  populateBy?: 'collection' | 'selection'
  populatedDocs?: ArchiveBlockProps['populatedDocs']
  populatedDocsTotal?: ArchiveBlockProps['populatedDocsTotal']
  relationTo?: 'products'
  selectedDocs?: ArchiveBlockProps['selectedDocs']
  showPageRange?: boolean
  sort?: string
}

export const CollectionArchive: React.FC<Props> = props => {
  const { categoryFilters, sort } = useFilter();
  const {
    className,
    limit = 10,
    onResultChange,
    populateBy,
    populatedDocs,
    populatedDocsTotal,
    relationTo,
    selectedDocs,
    showPageRange,
  } = props

  const [results, setResults] = useState<Result>({
    docs: (populateBy === 'collection'
      ? populatedDocs
      : populateBy === 'selection'
      ? selectedDocs
      : []
    )?.map(doc => doc.value) || [],
    hasNextPage: false,
    hasPrevPage: false,
    nextPage: 1,
    page: 1,
    prevPage: 1,
    totalDocs: typeof populatedDocsTotal === 'number' ? populatedDocsTotal : 0,
    totalPages: 1,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasHydrated = useRef(false)
  const isRequesting = useRef(false)
  const [page, setPage] = useState(1)

  const fetchResults = useCallback(async () => {
    if (populateBy !== 'collection' || isRequesting.current) return

    isRequesting.current = true
    setIsLoading(true)

    const searchQuery = qs.stringify(
      {
        depth: 1,
        limit,
        page,
        sort,
        where: {
          ...(categoryFilters?.length > 0
            ? {
                categories: {
                  in: categoryFilters,
                },
              }
            : {}),
        },
      },
      { encode: false },
    )

    try {
      const req = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/${relationTo}?${searchQuery}`,
      )

      const json = await req.json()

      if (json.docs && Array.isArray(json.docs)) {
        setResults(json)
        if (typeof onResultChange === 'function') {
          onResultChange(json)
        }
      }
    } catch (err) {
      console.warn(err)
      setError(`Unable to load "${relationTo} archive" data at this time.`)
    } finally {
      setIsLoading(false)
      isRequesting.current = false
      hasHydrated.current = true
    }
  }, [page, categoryFilters, relationTo, onResultChange, sort, limit, populateBy])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  return (
    <div className={[classes.collectionArchive, className].filter(Boolean).join(' ')}>
      <div className={classes.scrollRef} ref={scrollRef} />
      {!isLoading && error && <div>{error}</div>}
      {isLoading && <div>Loading...</div>}
      {!isLoading && !error && (
        <Fragment>
          {showPageRange !== false && populateBy !== 'selection' && (
            <div className={classes.pageRange}>
              <PageRange
                collection={relationTo}
                currentPage={results.page}
                limit={limit}
                totalDocs={results.totalDocs}
              />
            </div>
          )}
          <div className={classes.grid}>
            {results.docs?.map((result, index) => {
              if (typeof result === 'object' && result !== null) {
                return (
                  <Card key={result.id || index} doc={result} relationTo={relationTo} showCategories />
                )
              }
              return null
            })}
          </div>
          {results.totalPages > 1 && populateBy !== 'selection' && (
            <Pagination
              className={classes.pagination}
              onClick={setPage}
              page={results.page}
              totalPages={results.totalPages}
            />
          )}
        </Fragment>
      )}
    </div>
  )
}