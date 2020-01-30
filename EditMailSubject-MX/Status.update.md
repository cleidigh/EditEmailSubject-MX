## EditMailSubject-MX
#### General Notes about this Addon
The Addon 'Edit email subject' was first published by 'JC Prin' back in 2011 with compatiblity for Thunderbird 3. It's a "Legacy, XUL extension with overlays" addon.
Currently the activ version is 2.1.1 running up to TB60.*    
For future use with TB68 and greater it's necessary to convert it's technical base and that's the purpose of this project.   
The progress of the project can be followed with this document. XPI versions are generated for the development steps so to "freeze" these steps. The XPIs can be downloaded from the [GIT release page](https://github.com/cleidigh/EditEmailSubject-MX/releases/tag/), the first one is 2.1.1-wip.1


### Status &nbsp; 2020-01-30 &nbsp; / &nbsp; [2.1.1-wip.2](https://github.com/cleidigh/EditEmailSubject-MX/releases/tag/2.1.1-wip.2)

Only one little change: with the previous version (wip-1) a user changes the **prefs/options** setting on the Add-on Manager page. Basically this is not a problem, but would be difficult / not nice with an extensions with a larger number of preferences.   
Adding `open_in_tab": true` in `webextension/manifest.json` will open the `options.html` code in a new tab.   
Pitfall/Todo: the tab has neither a label nor a popup title.



### Status &nbsp; 2020-01-11 &nbsp; / &nbsp; [2.1.1-wip.1](https://github.com/cleidigh/EditEmailSubject-MX/releases/tag/2.1.1-wip.1)
To be prepared for the move from TB60 to TB68 and greater, this first change includes 'webextension' for **locales,prefs,option** handling. Also the legacy prefs system is used, the `prefs` can be changed only on the Addon-Mgnr page.   
**locales** text elements are converted to 'data-l10n-id' format and stored in json format (see 'webextension' dir)

An jsm module holds WebExtension coding and also some general supporting functions.

***Note:***   
This addon version is based on https://github.com/cleidigh/EditEmailSubject-MX/scr

  For a complete change overview compare the directories   
    * EditEmailSubject-MX/scr   
    * EditEmailSubject-MX/EditMailSubject-MX/

### Naming of Addon changed!
_(only for convenience, but naming needs to be consistent all over the addon!)_

         <em:id>editemailsubject@jcp.convenant</em:id>
    was  <em:id>EditMailSubject@jcp.convenant</em:id>

### Directory structure changes:

  * chrome/content/locale --> chrome/content/locales   
     _Note:_   de-DE --> de  changed!

added:

  * `chrome/content/skin/images`     to hold image files (png/jpg/..)
  * `chrome/content/skin/platform`   for linux specific

### `webextension`
  New directory with directories
  * options
  * _locales

### `modules`
New directory with `EditMailSubject.jsm` for Options handling   

  * first step to handle prefs with `storage`
  * getting windows
  * opening window (within addon and external)
  * open/reuse TAB   
  --> in `EditMailSubject.jsm` see `//XXX MX` marks for required changes

### `install.rdf`
added/changed   
  * <<em:id>>editemailsubject@jcp.convenant
  * <<em:hasEmbeddedWebExtension>>
  * icon
  * min/maxVersion

### `chrome.manifest`
added/changed
  * `resource editemailsubject  .  `   (line has to have the dot!)
  * skin
  * locales (instead of locale), also de-DE --> de



### General Notes / Next Steps

#### Prefs of this Addon vs general situation

This Addon _'EditMailSubject'_ has only two prefs items (localOnly, version). For an Addon with more prefs items the WebExtension coding should be changed to be more flexible.

#### locales/_locales
The orignal Addon uses only .dtd files for XUL elements `like label="&lang.menuTitle;"`.    
`.properties` files are not used, no (legacy) stringhandler is loaded.

The script `migrateLocale.py` can be used to convert the `locales` to `_locales`, but eventually the dir/file positioning has to be changed manually.
