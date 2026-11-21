# Envoyer la démo sur Steam (SteamPipe)

À faire une fois le compte Steamworks créé et la démo ajoutée dans Steamworks (une démo est une application gratuite rattachée au jeu, sans payer 100 $ de plus).

1. Fabriquer l'application : `node scripts/build-steam.js --appid=APPID_DU_JEU` (sans `--full` = la démo).
2. Dans `app_build_demo.vdf`, remplacer `DEMO_APPID` par l'App ID de la démo et `DEMO_DEPOTID` par son dépôt (en général App ID + 1).
3. Télécharger le Steamworks SDK (partner.steamgames.com → SDK), puis lancer :
   `tools\ContentBuilder\builder\steamcmd.exe +login <compte_steamworks> +run_app_build "C:\Users\louis\Documents\toupie-cafards\steam-app\steampipe\app_build_demo.vdf" +quit`
   (le mot de passe et le code Steam Guard sont à taper par toi).
4. Dans Steamworks → Installation : exécutable `ToupieContreCafardsDemo.exe`, système Windows 64 bits.
5. Publier la build sur la branche « default », puis demander la vérification de la démo.
