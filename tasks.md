### Tasks and potential problems
- Nodes are updated in cascade also when a connection is not directly or indirectly affected. A non-related node triggers the updates of all other nodes. To investigate if it could become a potential performance problem with multiple nodes. Point of interest: **nodeUtils.syncNodeDataFromSource**
- for corsproxy requests look into caching data in order to avoid multiple requests.



### Rules
- two nodes cannot have more than one connection of any type.


### Sample images url
- https://www.ephotozine.com/resize/articles/22672/Laku.jpg?RTUdGk5cXyJFCgsJVANtdxU+cVRdHxFYFw1Gewk0T1JYFEtzen5YdgthHHsvEVxR
- https://www.ephotozine.com/resize/articles/22672/I_See_You.jpg?RTUdGk5cXyJFCgsJVANtdxU+cVRdHxFYFw1Gewk0T1JYFEtzen5YdgthHHsvEVxR
- https://www.ephotozine.com/resize/articles/22672/Lollycat.jpg?RTUdGk5cXyJFCgsJVANtdxU+cVRdHxFYFw1Gewk0T1JYFEtzen5YdgthHHsvEVxR
- cursor: https://blob.gifcities.org/gifcities/2CEGEQDTBN7R4YYOD436RPUZCQQHZVZO.gif
- GIF Bg: https://blob.gifcities.org/gifcities/7CQFXNDVE7KERJ3Y26PVSRKANAMFWPLE.gif
- GIF Bg: https://blob.gifcities.org/gifcities/DMQTXVF6TEIIGPKUJJQJSVPTO2TEZA2E.gif
- GIF Bg: https://blob.gifcities.org/gifcities/H5AWBXGZTCQ3E3W7FJMW2D5NTTPIL6GO.gif


**RULES**
1. input fields of nodes must have the id name in the format of "field-{fieldName}" where fieldName is the exact name of the field in the type specified in NodeTypes.


**SUPABASE/VERCEL/RESEND (config for prod)**
- env variable settings for VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
- redirecturl in supabase: Authentication/Url Configuration/Site URL -> the user landing page.