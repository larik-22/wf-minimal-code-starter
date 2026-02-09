# Integration with Webflow

In Webflow, there are two possibilities:

In both cases, you have the HMR (Hot Module Reload) in place, it allows you to refresh the page each time you save a TS file. It's convenient and it will save you time.

-   If you do both Webflow dev and TS:

    Paste this script into the `Before </body> tag` part of the Webflow custom code in the project settings so that it loads on all pages.

    ```html
    <script type="module" src="http://localhost:3000/@vite/client"></script>
    <script type="module" src="http://localhost:3000/src/main.ts"></script>
    ```

-   If you are doing the TS dev but not the Webflow dev (**recommended version**):

    Paste this script in the `Before </body> tag` part of the Webflow custom code in the project settings so that it loads on all pages. We will change the url of Netlify later to load the production files.

    ```jsx
    <script>
      (function () {
        const LOCALHOST_URL = [
          'http://localhost:3000/@vite/client',
          'http://localhost:3000/src/main.ts',
        ]
        const PROD_URL = ['https://MY-PROJECT.netlify.app/main.js']

        function createScripts(arr, isDevMode) {
          return arr.map(function (url) {
            const s = document.createElement('script')
            s.src = url

            if (isDevMode) {
              s.type = 'module'
            }

            return s
          })
        }

        function insertScript(scriptArr) {
          scriptArr.forEach(function (script) {
            document.body.appendChild(script)
          })
        }

        const localhostScripts = createScripts(LOCALHOST_URL, true)
        const prodScripts = createScripts(PROD_URL, false)

        let choosedScripts = null

        fetch(LOCALHOST_URL[0], {})
          .then(() => {
            choosedScripts = localhostScripts
          })
          .catch((e) => {
            choosedScripts = prodScripts
            console.error(e)
          })
          .finally(() => {
            if (choosedScripts) {
              insertScript(choosedScripts)

              return
            }

            console.error('something went wrong, no scripts loaded')
          })
      })()
    </script>
    ```
