/**
 * MIT License
 *
 * Copyright (c) 2023 Jonathan Linat <https://github.com/jonathanlinat>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

module.exports = (shared) => {
  const helpersShared = shared.helpers

  return async (iterationLimiter, singleSource) => {
    const dataMapperHelpers = helpersShared.dataMapper(shared)
    const dataScraperHelpers = helpersShared.dataScraper(shared)
    const dateFormatterHelpers = helpersShared.dateFormatter(shared)
    const functionParamsValidator = helpersShared.functionParamsValidator()
    const gameIdentifierMapperHelpers =
      helpersShared.gameIdentifierMapper(shared)
    const languageMapperHelpers = helpersShared.languageMapper(shared)
    const sizeToBytesParserHelpers = helpersShared.sizeToBytesParser(shared)
    const urlEncoderHelpers = helpersShared.urlEncoder(shared)

    functionParamsValidator([iterationLimiter, singleSource])

    const { sourceName, sourceUrl } = singleSource
    const { isIterationLimiterEnabled, maxIterationCount } = iterationLimiter

    let iterationCounter = 0
    let structuredScrappedData = {}

    try {
      // Search page

      const fetchedSearchPageData = await dataScraperHelpers(
        urlEncoderHelpers(sourceUrl + '/search.cgi'),
        { search: '', sort: 'title' }
      )
      const searchPageReference = fetchedSearchPageData('body tr[bgcolor]')

      for (const searchPage of searchPageReference) {
        if (
          isIterationLimiterEnabled &&
          iterationCounter >= maxIterationCount
        ) {
          break
        }

        const searchPageSelector = fetchedSearchPageData(searchPage)

        const name =
          searchPageSelector.find('td:nth-child(1)').text().trim() || ''
        const detailsPageUrl = urlEncoderHelpers(
          sourceUrl +
            searchPageSelector.find('a[href*="/m/"]')[0].attribs.href.trim() ||
            ''
        )

        // Mission page

        const fetchedMissionPageData = await dataScraperHelpers(detailsPageUrl)
        const missionPageSelector = fetchedMissionPageData(
          'table[cellspacing][cellpadding]'
        ).first()

        const gameIdentifier = gameIdentifierMapperHelpers(
          missionPageSelector
            .find('tr:contains("Game") td:nth-child(2)')
            .text()
            .match(/^(.*?)\([^)]+\)/)[1]
            .trim() || ''
        )
        const authors = missionPageSelector
          .find('tr:contains("Author") td:nth-child(2)')
          .text()
          .trim()
          .split(',')
          .map((author) =>
            author
              .replace(/\(missions by this author\)|\(homepage\)/g, '')
              .trim()
          ) || ['']

        const lastReleaseDate = dateFormatterHelpers(
          missionPageSelector
            .find('tr:contains("Released") td:nth-child(2)')
            .text()
            .match(/\d{4}\.\d{2}\.\d{2}/)[0]
            .replace(/\./g, '-')
            .trim() || '2000-01-01'
        )

        const fileSize = sizeToBytesParserHelpers(
          missionPageSelector
            .find('tr:contains("Size") td:nth-child(2)')
            .text()
            .match(/^\s*([^()\s]+)/)[1]
            .trim() || '0MB'
        )
        const languages = missionPageSelector
          .find('tr:contains("Languages") td:nth-child(2)')
          .text()
          .split(' ')
          .map((language) => languageMapperHelpers(language.trim())) || ['']

        const scrapedData = {
          authors,
          detailsPageUrl,
          fileSize,
          gameIdentifier,
          languages,
          lastReleaseDate,
          name,
          sourceName
        }

        console.log(scrapedData)

        structuredScrappedData = dataMapperHelpers(
          structuredScrappedData,
          scrapedData
        )

        isIterationLimiterEnabled && iterationCounter++
      }

      return structuredScrappedData
    } catch (error) {
      console.error(error)
    }
  }
}
