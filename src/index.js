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

require('module-alias/register')

const modules = require('@modules')
const recipes = require('@recipes')
const shared = require('@shared')

;(async () => {
  const scraperModules = modules.scraper(recipes, shared)
  const downloaderModules = modules.downloader(recipes, shared)
  const dependenciesShared = shared.dependencies

  const fsDependencies = dependenciesShared.fs
  const pathDependencies = dependenciesShared.path

  try {
    const scrapedData = await scraperModules()

    fsDependencies.writeFile(
      pathDependencies.resolve(__dirname, './output.json'),
      scrapedData,
      'utf8',
      (err) => {
        if (err) {
          console.error('Error writing JSON file:', err)
        } else {
          console.log('JSON file has been written successfully.')
        }
      }
    )

    downloaderModules()
  } catch (error) {
    console.error(error)
  }
})()
