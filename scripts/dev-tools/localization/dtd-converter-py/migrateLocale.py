#!/usr/bin/env python3

#  /migrateLocale.py/  gWahl  2019-12-19/

import os, sys, json, re

#------------------------------------------------

def fileDetails(dir, path):
    filename= path[path.rfind('/')+1:]
    language= dir[dir.rfind('/')+1:]
    dirhome= dir[:dir.rfind('/')].replace('locale','_locales')
    return [dirhome, language, filename]

localePath = "**"

def scan_dir(dir):
    global localePath

    for name in os.listdir(dir):
        path = os.path.join(dir, name)
        if os.path.isdir(path):
            if '/locale' == path[-7:]:
                localePath = path
                _localesPath = path.replace('locale','_locales')
                newDir(_localesPath)
                #print (" _locales created!!!!", _localesPath)

            if localePath in path:
                newDir(path.replace('/locale/','/_locales/'))
            scan_dir(path)

def newDir(dir):
    if not os.path.exists(dir):
       print ("Directory doesn't exist. Make new", dir)
       os.makedirs(dir)

def scan_locales(dir):
    for name in os.listdir(dir):
        path = os.path.join(dir, name)

        if os.path.isfile(path):
            if localePath in path and ('.dtd' in path):
              convert_dtd(path, dir)
            if localePath in path and ('.properties' in path):
                convert_prop(path, dir)
        else:
            scan_locales(path)

def convert_dtd(details, dir):
    _fileDetails = fileDetails(details,dir)
    messagesjson = _fileDetails[0] + "/messages.json"
    print(" <myaddon.dtd> converted to JSON for ", _fileDetails[2])

    p = re.compile(r'\s+')
    sdtd = '{'

    dtd = open(details, 'r')
    dtdLines = dtd.readlines()

    for line in dtdLines:
        sline = line.strip().replace('\r','').replace('\n','')
        #print("next line >>" + line + "<<", len(line))

        if sline != '' and sline.find('<!--') == -1:
            b = p.split(sline, 2)
            b2 = b[2][0:(len(b[2])-1)]
            sdtd = sdtd + " \"" + b[1] +"\""+ ":" + b2 + ","
    sdtd = sdtd[:-1] + '}'

    # write json file
    f = open(messagesjson, 'w')
    f.write(sdtd)
    f.close()

    # check the file for correctness
    print("   Testing ", messagesjson)
    with open(messagesjson) as f:
        d = json.load(f)
        e = (json.dumps(d, indent=2))
        f = open(messagesjson, 'w')
        f.write(e)
        f.close()


def convert_prop(details, dir):
    _fileDetails = fileDetails(details,dir)
    propjson = _fileDetails[0] + "/properties.json"
    print(" <myaddon.properties> converted to JSON for ", _fileDetails[2])

    sprop = '{'
    prop = open(details, 'r')
    propLines = prop.readlines()

    for line in propLines:
        sline = line.strip().replace('\r','').replace('\n','')
        #print("next line >>" + line + "<<", len(line))

        if sline != '' and sline[0] != '#':
            a = sline.split('=')
            sprop = sprop + " \"" + a[0] +"\""+ ":\"" + a[1].replace("\"","'") + "\","
    sprop = sprop[:-1] + '}'

    # write json file
    f = open(propjson, 'w')
    f.write(sprop)
    f.close()

    # check the file for correctness
    print("   TESTING ", propjson)
    with open(propjson) as f:
        d = json.load(f)
        e = (json.dumps(d, indent=2))
        f = open(propjson, 'w')
        f.write(e)
        f.close()

if __name__ == "__main__":

    print ("""___ Migrate Thunderbird 60:Legacy 'locale' to WebExt JSON format ___""")

    if (len(sys.argv) == 2) and sys.argv[1] == "--help":
        print ("""
      Webextension (and Mailextension) can't work with the legacy 'locale'
      text notation/format (*.properties and *.dtd).
      To reuse those legacy addon text elements this python3 program
      converts all 'locale' file content to JSON format files for further
      use in WebExt/MailExt addon versions.

      Legacy                             WebExt
       locale                              _locales
         |__ <languageX>                      |__ <languageX>
               |__ <myaddon.dtd>                    |__ <messages.json>
               |__ <myaddon.properties>             |__ <properties.json>


      Arguments:
        No arguments. Scan tree from '.'
        Use --help argument to get this help listing

      Testing:
        Each JSON file is directly reloaded with the python function
        json.load(f), so any un-resolved .dtd or .properties string
        would throw a python error.
        Example:
          Assume a .dtd line with:
            <!ENTITY rf.options.list.startingday.label "Startdag fan \&apos;e wike">
          Also the converting will write an JSON file (messages.json),
          the file testing will throw an python error like this:
            json.decoder.JSONDecodeError: Invalid \escape: line 1 column 17672 (char 17671)

          More details will give an JSON Validator with:
            Parse error on line 1:
            ....startingday.label":"Startdag fan \&apos
            -----------------------^
            Expecting 'STRING', 'NUMBER', 'NULL', 'TRUE', 'FALSE', '{', '[', got 'undefined'

        JSON Validators:
            https://jsonlint.com/
            http://jsoneditoronline.org/
            https://jsonformatter.curiousconcept.com/
        """)

        exit()

    scan_dir('.')     #scan dirs and builds new '_locales' and language subdirs
    scan_locales('.')  #process .dtd and .properties files

    print( """___         ___ Done ___         ___""")
