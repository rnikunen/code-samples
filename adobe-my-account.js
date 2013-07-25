(document).ready(function () {
    initAddressBook();
    $(".billingaddress .ChangeCountryHelp, .billingaddress .CloseChangeCountryHelp").click(function (e) {
        e.preventDefault();
        $(".billingaddress .WhatIsThisTipCountry").toggle();
    })
    $(".shippingaddress .ChangeCountryHelp, .shippingaddress .CloseChangeCountryHelp").click(function (e) {
        e.preventDefault();
        $(".shippingaddress .WhatIsThisTipCountry").toggle();
    })
});
function initAddressBook() {
    OpenAjax.hub.subscribe('sso.ready', function (event, sso) {
        if (sso.cayenneAuthenticated()) {
            setCustomBindings();
            setStateListBindings();
            limitInputs();
            WCDServer = $.cookie('WCDServer');
            var locale = Adobe.PageInfo.AcceptLanguage;
            $("#myaddressbookSection input:not(:hidden)").val("");
            $.each(Adobe.AddressBook.AddressTypes, function (index, value) {
                var url = (Adobe.PageInfo.isJSP == undefined) ? "/svcs/accounts/" + sso.GUID() + "/address_book/" + value + "_addresses" : "/include/jmvc/adobe/account/fixtures/my.info.jp.billing.json";
                if (Adobe.PageInfo.isJSP != undefined && index == 1) {
                    url = "/include/jmvc/adobe/account/fixtures/my.info.jp.shipping.json"
                }
                $.ajax({
                    type: 'GET',
                    url: url,
                    contentType: 'application/json; charset=UTF-8',
                    success: function (data) {
                        if (data == null || data == "" || !data["address.address"]) {
                            getAccountData(value);
                            return;
                        }
                        var path = window.location.pathname,
                            pathHasCH = (path.indexOf("/ch_de/") > -1 | path.indexOf("/ch_it/") > -1 || path.indexOf("/ch_fr/") > -1),
                            pathHasBE = (path.indexOf("/be_en/") > -1 | path.indexOf("/be_fr/") > -1 || path.indexOf("/be_nl/") > -1),
                            pathHasLU = (path.indexOf("/lu_de/") > -1 | path.indexOf("/lu_en/") > -1 || path.indexOf("/lu_fr/") > -1),
                            userCountry = data["address.address"]["address.country"]["reference.iso_3166_alpha2_code"];
                        if ((userCountry == "CH" && !pathHasCH) || (userCountry == "BE" && !pathHasBE) || (userCountry == "LU" && !pathHasLU)) {
                            checkUserLanguage(userCountry);
                            return;
                        }
                        if (index == 0) {
                            Adobe.AddressBook.BillingJSON = data;
                        } else if (index == 1) {
                            Adobe.AddressBook.ShippingJSON = data;
                        }
                        setAddressObject(value, data);
                        setCountry(value, data);
                    },
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Accept-Language", locale);
                        xhr.setRequestHeader("Accept", "application/json");
                        xhr.setRequestHeader("x-adobe-authorization", WCDServer);
                        if (value == "shipping") {
                            xhr.setRequestHeader("Authorization", Adobe.Tokens.ShippingAddress);
                        } else if (value == "billing") {
                            xhr.setRequestHeader("Authorization", Adobe.Tokens.BillingAddress);
                        }
                    },
                    complete: function () {
                        var accountController = Adobe.Account.UserAccount.UserAccountController;
                        if (value == "shipping") {
                            accountController.initialServiceCalls.shippingAddress = true;
                        } else if (value == "billing") {
                            accountController.initialServiceCalls.billingAddress = true;
                        }
                        if (accountController.checkFullyLoaded()) {
                            myInfoMask.showContent();
                        }
                    },
                    error: function (data) {
// user created account in short form, so get account object data and figure out where to send them
// this user created their account in CCM or Support Portal
                        if (data.responseText.message = "BILLING_ADDRESS_NOT_PRESENT") {
                            getAccountData(value);
                            return;
                        } else {
                            setCountry(value);
                        }
                    }
                });
            });
            if ($("#DefaultShippingSection").is(":visible")) {
                //setShippingMethod();
            } else {
                accountController.initialServiceCalls.shippingMethod = true;
            }
        } else {
            sso.redirectToLogin();
        }
        myaddressbookSectionMask = $("#myaddressbookSection").view_mask({maskAlpha: .8}).controller();
    });

    $("#shipping-shipToBilling").change(function () {
        $("#shipping-Container").hide();
        //copyBillingToShipping();
    });
    $("#shipping-shipToDifferent").change(function () {
        $("#shipping-Container").show();
        $("#shipping-Container :input:not(:hidden)").val("");
        $("#shipping-Country-default").val($("#billing-Country-default").val());
        $("#shipping-Container select:visible").val("");
        $("#shipping-Container input, #shipping-Container select").removeClass("AccountFormInputError");
    });
    $("input[id^=billing-], select[id^=billing-]").change(function (e) {
    //changes in billing fields update shipping fields if Ship To Billing is checked.
        if ($("#shipping-shipToBilling").is(":checked")) {
            thisId = $(e.target).attr("id");
            shippingId = thisId.replace("billing", "shipping");
            $("#" + shippingId).val($(e.target).val());
        }
    });
    $("html").unbind("ajaxError")
}
function maskmyaddressbookSection() {
    myaddressbookSectionMask.hideContent(undefined, true);
}
function showmyaddressbookSection() {
    myaddressbookSectionMask.showContent();
}
function setCustomBindings() {
    $("#billing-StateProvince").bind("statesReady", function (event, addressJson) {
        if (!undefinedOrEmpty(addressJson)) {
            fillAddressForm(addressJson, "billing");
        }
    });
    $("#shipping-StateProvince").bind("statesReady", function (event, addressJson) {
        if (!undefinedOrEmpty(addressJson)) {
            fillAddressForm(addressJson, "shipping");
        }
    });
    $("#billing-countryCodeList").bind("countrySet", function (event, countryCode, data, value) {
        setStateDropdown("billing", countryCode, data);
    });
    $("#shipping-countryCodeList").bind("countrySet", function (event, countryCode, data, value) {
        setStateDropdown("shipping", countryCode, data);
    });
}
function copyBillingToShipping() {
    $.each(Adobe.AddressBook.AddressFields, function (fieldIndex, fieldValue) {
        if ($("#" + Adobe.AddressBook.AddressTypes[1] + "-" + fieldValue).length > 0 && $("#" + Adobe.AddressBook.AddressTypes[0] + "-" + fieldValue).length > 0) {
            $("#" + Adobe.AddressBook.AddressTypes[1] + "-" + fieldValue).val(decodeField($("#" + Adobe.AddressBook.AddressTypes[0] + "-" + fieldValue).val()));
        }
    });
    $("#Shipping-Country-default").val($("#Billing-Country-default").val());
}
function setCountry(value, data) {
    var countryCode = Adobe.AddressBook[value + "Address"]["country"] || Adobe.PageInfo.PageLocale;
    $("#" + value + "-Country-default").val(countryCode);
    var countryValue = $("#" + value + "-countryCodeList > input[value=" + countryCode + "]").attr("name");
    $("#" + value + "-countryCodeList > input").removeClass("billing-selectedCountry");
    $("#" + value + "-countryCodeList > input[value=" + countryCode + "]").addClass(value + "-selectedCountry");
    if (countryValue != undefined) $("#" + value + "-CountryText").text($.trim(countryValue));
    $("#" + value + "-countryCodeList").trigger("countrySet", [countryCode, data, value]);
    OpenAjax.hub.publish('addressServiceReturned', value);
}
function getCountry(addressType) {
    return $("#" + addressType + "-Country-default").val();
}
function setStateDropdown(value, countryCode, addressData) {
    var host = window.location.hostname,
        tokens = Adobe.Tokens || {},
        locale = Adobe.PageInfo.AcceptLanguage || "en_us",
        token = tokens.References,
        country = countryCode,
        handleEeurope = (country === "GR" || country === "CY" || country === "MT"),
        marketSegment = (Adobe.Profile.Edu.isEdu) ? "EDU" : "COM",
        state = (addressData != null) ? addressData["address.address"]["address.StateProvince"]["reference.code"] : "";
    if (handleEeurope) {
        locale = "en_xeu"
    }
    if (Adobe.AddressBook.ReferenceData != false) {
        buildStateProvinceList(value, country, Adobe.AddressBook.ReferenceData, addressData);
        return;
    }
    $.ajax({
        url: (host == "jmvc.adobe.com") ? "/include/jmvc/adobe/account/fixtures/my.info.jp.references.json" : "/svcs/references",
        type: 'get',
        data: 'locale=' + locale + '&market_segment=' + marketSegment + '&country=' + country + '&state=' + state,
        dataType: 'json',
//We need to get a consistent return from reference service so we will always request this specific version
        headers: {
//"Accept-Charset" : "UTF-8",
            "Authorization": token,
            "Accept": "application/vnd.Adobeservices.reference.2012-05-01+json"
        },
        contentType: 'application/json;charset=UTF-8',
        success: function (data) {
// user has address data with state info
            if (data["reference.reference"]["reference.sales_regions"] != null) {
                var handleMX = (country == "MX" && ((Adobe.PageInfo.PageLocale == "US" && Adobe.PageInfo.PageLocale == "MX") || (Adobe.PageInfo.PageLocale != "MX"))),
                    handleUK = (country == "GB" && (Adobe.PageInfo.PageLocale != "GB" && Adobe.PageInfo.PageLocale != "UK")),
                    handleEeurope = (country === "GR" || country === "CY" || country === "MT"),
                    pathHasEeurope = (window.location.pathname.indexOf("/eeurope") > -1);
                if (handleUK) {
                    var setRegion = "uk",
                        f = (window.location.hostname == "day.adobe.com") ? "/content/dotcom/" : "/",
                        q = (window.location.hostname == "day.adobe.com") ? "?wcmmode=DISABLED" : "";
                    window.location = f + setRegion + "/account/account-information.html" + q;
                    return;
                }
                if (handleEeurope && !pathHasEeurope) {
                    var setRegion = "eeurope",
                        f = (window.location.hostname == "day.adobe.com") ? "/content/dotcom/" : "/",
                        q = (window.location.hostname == "day.adobe.com") ? "?wcmmode=DISABLED" : "";
                    window.location = f + setRegion + "/account/account-information.html" + q;
                    return;
                }
                if (handleEeurope && pathHasEeurope) {
                    Adobe.AddressBook.ReferenceData = data;
                    buildStateProvinceList(value, country, data, addressData);
                    return;
                }
                var myAdobeLoc = $.inArray(country.toLowerCase(), Adobe.AddressBook.MyAdobeMembershipLocales);
// if user comes to the page from a country not of the current language and has a MyAdobe locale
                if (handleMX || (myAdobeLoc > -1 && country != Adobe.PageInfo.PageLocale)) {
                    var setRegion = Adobe.AddressBook.MyAdobeMembershipLocales[myAdobeLoc],
                        f = (window.location.hostname == "day.adobe.com") ? "/content/dotcom/" : "/",
                        q = (window.location.hostname == "day.adobe.com") ? "?wcmmode=DISABLED" : "";
                    if (setRegion == "US" || setRegion == "us") {
                        f = (window.location.hostname == "day.adobe.com") ? "/content/dotcom/en" : "";
                        setRegion = "";
                    }
                    if (setRegion == "cy" || setRegion == "mt" || setRegion == "gr") {
                        setRegion = "eeurope";
                    }
                    window.location = f + setRegion.toLowerCase() + "/account/account-information.html" + q;
                    return;
                }
                if (myAdobeLoc < 0) {
                    for (var key in Adobe.AddressBook.DylanMembershipLocaleGroups) {
                        var countryGrouping = Adobe.AddressBook.DylanMembershipLocaleGroups[key];
                        if ($.inArray(country, countryGrouping) > -1) {
                            redirectToDylan();
                            return;
                        }
                    }
                }
                Adobe.AddressBook.ReferenceData = data;
                buildStateProvinceList(value, country, data, addressData);
                if (value == "billing") toggleVatID(data, countryCode);
            } else {
// no country info data will be empty
                handleNoReferences();
            }
        },
        complete: function () {
            accountController.initialServiceCalls.references = true;
            if (accountController.checkFullyLoaded()) {
                myInfoMask.showContent();
            }
        },
        error: function (data) {
// reference service doesn't have record of user's country (500 error)
            handleNoReferences();
        }
    });
}
function toggleVatID(data, countryCode) {
    var vatSupported = data["reference.reference"]["reference.sales_regions"][0]['reference.legacy_store_info']['reference.vat_supported'];
    if ((!vatSupported || countryCode == "JP") && $("#AddressBook-VatID")) {
        $("#AddressBook-VatID").hide()
    }
}
// CCM type user
function getAccountData(value) {
    var tokens = Adobe.Tokens || {},
        token = tokens.Accounts;
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() :
        "/include/jmvc/adobe/account/fixtures/my.info.jp.billing.json";
    if (Adobe.AddressBook.AccountData != false) {
        handleAccountData(Adobe.AddressBook.AccountData, value);
        return;
    }
    $.ajax({
        url: url,
        type: 'get',
        dataType: 'json',
        contentType: 'application/json;charset=UTF-8',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", $.cookie('WCDServer'));
            xhr.setRequestHeader("Authorization", token);
        },
        success: function (data) {
            Adobe.AddressBook.AccountData = data;
            handleAccountData(data, value);
        }
    });
}
function handleAccountData(data, value) {
    var country = data['account.account']['account.country']['reference.iso_3166_alpha2_code'],
        myAdobeLoc = $.inArray(country.toLowerCase(), Adobe.AddressBook.MyAdobeMembershipLocales),
        path = window.location.pathname;
    Adobe.AddressBook.billingAddress.country = country;
    Adobe.AddressBook.shippingAddress.country = country;
    if (country == "GB" && country == Adobe.PageInfo.PageLocale) {
        setCountry(value);
        return;
    }
    var pathHasCH = (path.indexOf("/ch_de/") > -1 | path.indexOf("/ch_it/") > -1 || path.indexOf("/ch_fr/") > -1),
        pathHasBE = (path.indexOf("/be_en/") > -1 | path.indexOf("/be_fr/") > -1 || path.indexOf("/be_nl/") > -1),
        pathHasLU = (path.indexOf("/lu_de/") > -1 | path.indexOf("/lu_en/") > -1 || path.indexOf("/lu_fr/") > -1),
        pathHasEeurope = (path.indexOf("/eeurope/") > -1),
        eeuropeLocale = ( country === "GR" || country === "CY" || country === "MT" );
    if (eeuropeLocale) {
        myAdobeLoc = 16;
    }
    if (country == "MX" && Adobe.PageInfo.PageLocale == "US") {
        Adobe.PageInfo.PageLocale = "MX";
        setCountry(value);
        return;
    }
    if ((country == "CH" && !pathHasCH) || (country == "BE" && !pathHasBE) || (country == "LU" && !pathHasLU)) {
        checkUserLanguage(country);
        return;
    }
    if (pathHasEeurope && eeuropeLocale) {
        setCountry(value);
        return;
    }
    if (myAdobeLoc > -1 && country != Adobe.PageInfo.PageLocale && (!pathHasEeurope && !eeuropeLocale)) {
        var setRegion = Adobe.AddressBook.MyAdobeMembershipLocales[myAdobeLoc];
        var f = (window.location.hostname == "day.adobe.com") ? "/content/dotcom/" : "/",
            q = (window.location.hostname == "day.adobe.com") ? "?wcmmode=DISABLED" : "";
        if (setRegion == "US" || setRegion == "us") {
            f = (window.location.hostname == "day.adobe.com") ? "/content/dotcom/en" : "";
            setRegion = "";
        }
        if (setRegion == "cy" || setRegion == "mt" || setRegion == "gr") {
            setRegion = "eeurope";
        }
        window.location = f + setRegion.toLowerCase() + "/account/account-information.html" + q;
    } else if (myAdobeLoc == -1) {
        redirectToDylan();
    }
    else {
// CountryCode is within MyAdobe so show page
        setCountry(value);
    }
}
function checkUserLanguage(country) {
    var chOptions = '<li><a id="ch_de" class="LinkText">' + Adobe.PageInfo.LanguageSelect.CH.ch_de + '</a></li>' +
            '<li><a id="ch_fr" class="LinkText">' + Adobe.PageInfo.LanguageSelect.CH.ch_fr + '</a></li>' +
            '<li><a id="ch_it" class="LinkText">' + Adobe.PageInfo.LanguageSelect.CH.ch_it + '</a></li>',
        beOptions = '<li><a id="be_en" class="LinkText">' + Adobe.PageInfo.LanguageSelect.BE.be_en + '</a></li>' +
            '<li><a id="be_fr" class="LinkText">' + Adobe.PageInfo.LanguageSelect.BE.be_fr + '</a></li>' +
            '<li><a id="be_nl" class="LinkText">' + Adobe.PageInfo.LanguageSelect.BE.be_nl + '</a></li>',
        luOptions = '<li><a id="lu_de" class="LinkText">' + Adobe.PageInfo.LanguageSelect.LU.lu_de + '</a></li>' +
            '<li><a id="lu_en" class="LinkText">' + Adobe.PageInfo.LanguageSelect.LU.lu_en + '</a></li>' +
            '<li><a id="lu_fr" class="LinkText">' + Adobe.PageInfo.LanguageSelect.LU.lu_fr + '</a></li>';
    if (country == "CH") {
        var options = chOptions;
    }
    else if (country == "BE") {
        var options = beOptions;
    }
    else {
        var options = luOptions;
    }
    var dialog = '<div id="chooseLanguage" class="LayoutCell">' +
        '<h3 class="TextH3">Please select your language</h3>' +
        '<ul class="LayoutRow">' +
        options +
        '</ul>' +
        '</div>';
    $("#LayoutBody-Content").append(dialog);
    $("#chooseLanguage").dialog({
        closeOnEscape: false,
        position: {
            my: "left top", at: "center-10% center-10%", of: $(this)
        },
        open: function (event, ui) {
            var styles = {
                "z-index": 1000
            }
            $(this).css(styles);
            $(this).parent().css(styles);
            $(".ui-dialog-titlebar-close, .ui-resizable-handle").hide();
            $(".ui-dialog-titlebar-close").css({"visibility": "hidden"});
        }
    });
    $('#chooseLanguage a').click(function (e) {
        var f = (window.location.hostname == "day.adobe.com") ? "/content/dotcom/" : "/",
            q = (window.location.hostname == "day.adobe.com") ? "?wcmmode=DISABLED" : "";
        window.location = f + $(this).attr('id') + "/account/account-information.html" + q;
        return;
    })
    return;
}
function handleNoReferences(userCountry) {
    var setRegion;
    if (userCountry == undefined) {
        redirectToDylan();
    }
// User Country if we're redirecting them to the right MyAdobe page
    else {
        redirectToMyAdobe(userCountry);
    }
}
function redirectToMyAdobe(userCountry) {
    userCountry = (userCountry === "GB") ? "UK" : userCountry;
    var myAdobeLoc = $.inArray(userCountry.toLowerCase(), Adobe.AddressBook.MyAdobeMembershipLocales);
// Oops, not MyAdobe
    if (myAdobeLoc == -1) {
        redirectToDylan();
        return;
    }
    setRegion = Adobe.AddressBook.MyAdobeMembershipLocales[myAdobeLoc];
    var f = (window.location.hostname == "day.adobe.com") ? "/content/dotcom/" : "/",
        q = window.location.search;
    if (setRegion == "US" || setRegion == "us") {
        f = (window.location.hostname == "day.adobe.com") ? "/content/dotcom/en" : "";
        setRegion = "";
    }
    if (setRegion == "cy" || setRegion == "mt" || setRegion == "gr") {
        setRegion = "eeurope";
    }
    window.location = f + setRegion.toLowerCase() + "/account/account-information.html" + q;
    return;
}
function redirectToDylan() {
    var setRegion;
    if (Adobe.AddressBook.billingAddress.country != null) {
        var loc = Adobe.AddressBook.billingAddress.country,
            loc = (loc === "GB") ? "UK" : loc;
        if ($.inArray(loc.toLowerCase(), Adobe.AddressBook.MyAdobeMembershipLocales) > -1) {
            redirectToMyAdobe(Adobe.AddressBook.billingAddress.country);
            return;
        }
        else if ($.inArray(loc.toLowerCase(), Adobe.AddressBook.DylanMembershipLocales) > -1) {
            setRegion = loc.toLowerCase();
        }
        else if ($.inArray(loc, Adobe.AddressBook.UnaccountedLocales) > -1) {
            setRegion = "en_xem";
        }
        else {
            for (var key in Adobe.AddressBook.DylanMembershipLocaleGroups) {
                var countryGrouping = Adobe.AddressBook.DylanMembershipLocaleGroups[key];
                if ($.inArray(loc, countryGrouping) > -1) {
                    setRegion = key
                }
            }
        }
    }
    if (!setRegion || setRegion == "") setRegion = "en_xem";
    var url = "/cfusion/membership/index.cfm?nl=1&nf=1&view=snMemActDtls&tab=personal-info&loc=" + setRegion;
    if (setRegion != undefined) {
        window.location = url;
    }
}
function buildStateProvinceList(addressType, country, data, addressData) {
    var stateCode = (addressData != null) ? addressData["address.address"]["address.StateProvince"]["reference.code"] : "",
        statesMenu = $("#" + addressType + "-" + 'StateProvince'),
        markup = "",
        code,
        countries = data["reference.reference"]["reference.sales_regions"][0]["reference.countries"],
        states,
        countryName;
    $.each(countries, function (index, value) {
        if (country == countries[index]["reference.iso_3166_alpha2_code"]) {
            states = countries[index]["reference.state_province"];
            countryName = countries[index]["reference.iso_3166_name"];
            if (addressType == "shipping")
                setShippingMethod(countries[index]["reference.shipping_carrier_info"]);
        }
    });
    if (states != undefined) {
        if (country == "JP") {
            states.sort(function (a, b) {
                return a["reference.code"].toString() - b["reference.code"].toString();
            })
        }
        for (var i = 0; i < states.length; i++) {
            code = states[i]["reference.code"];
            markup += '<option value="' + code;
            markup += code == stateCode ? '" selected="selected">' : '">';
            markup += states[i]["reference.name"] + '</option>';
        }
        statesMenu.find("option:not(:first)").remove();
        statesMenu.append(markup);
    } else {
        statesMenu.parents('.ColumnAddressBook-1-2').hide();
        statesMenu.attr("disabled", "true");
    }
    $("#" + addressType + "-CountryText").html(countryName);
    $("#" + addressType + "-StateProvince").trigger("statesReady", addressData);
}
function setAddressObject(addressType, addressJson) {
    if (typeof(addressJson) != 'undefined') {
        tempAddressMaps = {
            "firstName": addressJson["address.address"]["address.contact"]["contact.firstName"],
            "lastName": addressJson["address.address"]["address.contact"]["contact.lastName"],
            "firstNamePronounce": addressJson["address.address"]["address.contact"]["contact.pronunciation_first_name"] || "",
            "lastNamePronounce": addressJson["address.address"]["address.contact"]["contact.pronunciation_last_name"] || "",
            "companyName": addressJson["address.address"]["address.contact"]["contact.companyName"],
            "companyNamePronounce": addressJson["address.address"]["address.contact"]["contact.pronunciation_company_name"] || "",
            "department": addressJson["address.address"]["address.contact"]["contact.department"],
            "street4": (!$.isUndefined(addressJson["address.address"]["address.street4"])) ? addressJson["address.address"]["address.street4"] : "",
            "street1": addressJson["address.address"]["address.street1"],
            "street2": addressJson["address.address"]["address.street2"],
            "street3": (!$.isUndefined(addressJson["address.address"]["address.street3"])) ? addressJson["address.address"]["address.street3"] : "",
            "city": addressJson["address.address"]["address.city"],
            "StateProvince": addressJson["address.address"]["address.StateProvince"]["reference.code"],
            "postalCode": addressJson["address.address"]["address.postalCode"],
            "country": addressJson["address.address"]["address.country"]["reference.iso_3166_alpha2_code"],
            "phone": addressJson["address.address"]["address.contact"]["contact.phone"],
            "vat": (!$.isUndefined(addressJson["address.address"]["address.contact"]["contact.vat_id"])) ? addressJson["address.address"]["address.contact"]["contact.vat_id"] : ""
        };
        if (tempAddressMaps.country == "JP") {
            var postalCode = String(tempAddressMaps['postalCode'])
            if (postalCode.indexOf('-') != -1) { //Fix for HP ALM 2752L, added else condition
                tempAddressMaps['postalCode1'] = postalCode.split('-')[0];
                tempAddressMaps['postalCode2'] = postalCode.split('-')[1];
            }
            else {
                tempAddressMaps['postalCode1'] = postalCode.substring(0, 3);
                tempAddressMaps['postalCode2'] = postalCode.substring(3);
            }
        }
        $.each(tempAddressMaps, function (index, value) {
            Adobe.AddressBook[addressType + "Address"][index] = decodeField(value);
        });
    }
}
function fillAddressForm(addressJson, addressType) {
    if (undefinedOrEmpty(addressJson["address.address"]["address.contact"]["contact.firstName"]) && undefinedOrEmpty(addressJson["address.address"]["address.contact"]["contact.lastName"])) {
        getProfileDataForAddress();
    }
    if (typeof(addressJson) != 'undefined') {
        tempAddressMaps = {
            "companyName": addressJson["address.address"]["address.contact"]["contact.companyName"],
            "phone": addressJson["address.address"]["address.contact"]["contact.phone"],
            "firstName": addressJson["address.address"]["address.contact"]["contact.firstName"],
            "lastName": addressJson["address.address"]["address.contact"]["contact.lastName"],
            "street4": (!$.isUndefined(addressJson["address.address"]["address.street4"])) ? addressJson["address.address"]["address.street4"] : "",
            "street1": addressJson["address.address"]["address.street1"],
            "street2": addressJson["address.address"]["address.street2"],
            "street3": (!$.isUndefined(addressJson["address.address"]["address.street3"])) ? addressJson["address.address"]["address.street3"] : "",
            "city": addressJson["address.address"]["address.city"],
            "postalCode": addressJson["address.address"]["address.postalCode"],
            "country": addressJson["address.address"]["address.country"]["reference.iso_3166_alpha2_code"],
            "StateProvince": addressJson["address.address"]["address.StateProvince"]["reference.code"],
            "vat": (!$.isUndefined(addressJson["address.address"]["address.contact"]["contact.vat_id"])) ? addressJson["address.address"]["address.contact"]["contact.vat_id"] : ""
        };
        if (tempAddressMaps.country == "JP") {
            var postalCode = String(tempAddressMaps['postalCode'])
            if (postalCode.indexOf('-') != -1) { //Fix for HP ALM 2752L, added else condition
                tempAddressMaps['postalCode1'] = postalCode.split('-')[0];
                tempAddressMaps['postalCode2'] = postalCode.split('-')[1];
            }
            else {
                tempAddressMaps['postalCode1'] = postalCode.substring(0, 3);
                tempAddressMaps['postalCode2'] = postalCode.substring(3);
            }
            Adobe.AddressBook.AddressFieldMapping["firstNamePronounce"] = "FirstNamePronunciation";
            Adobe.AddressBook.AddressFieldMapping["lastNamePronounce"] = "LastNamePronunciation";
            Adobe.AddressBook.AddressFieldMapping["companyNamePronounce"] = "CompanyPronunciation";
            Adobe.AddressBook.AddressFieldMapping["department"] = "Department";
            Adobe.AddressBook.AddressFieldMapping["postalCode1"] = "PostalCode1";
            Adobe.AddressBook.AddressFieldMapping["postalCode2"] = "PostalCode2";
            tempAddressMaps['firstNamePronounce'] = addressJson["address.address"]["address.contact"]["contact.pronunciation_first_name"] || "";
            tempAddressMaps['lastNamePronounce'] = addressJson["address.address"]["address.contact"]["contact.pronunciation_last_name"] || "";
            tempAddressMaps['companyNamePronounce'] = addressJson["address.address"]["address.contact"]["contact.pronunciation_company_name"] || "";
            tempAddressMaps['department'] = addressJson["address.address"]["address.contact"]["contact.department"] || "";
        }
        $.each(tempAddressMaps, function (index, value) {
            if (value == undefined || value == "undefined") {
                value = "";
            }
            if (index != "StateProvince") {
                $("#" + addressType + "-" + Adobe.AddressBook.AddressFieldMapping[index]).val(decodeField(value));
            } else {
                $("#" + addressType + "-StateProvince [value=" + value + "]").attr('selected', true);
            }
            $("#" + addressType + "-" + Adobe.AddressBook.AddressFieldMapping[index] + "-default").val(decodeField(value));
        });
    }
    if (objectsEqual(Adobe.AddressBook.billingAddress, Adobe.AddressBook.shippingAddress)) {
        Adobe.AddressBook.shipToDifferent = false;
        $("#shipping-shipToBilling").attr("checked", "checked");
        $("#shipping-Container").hide();
    } else {
        Adobe.AddressBook.shipToDifferent = true;
        $("#shipping-shipToDifferent").attr("checked", "checked");
        $("#shipping-Container").show();
    }
}
function getProfileDataForAddress() {
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/user" :
        "/include/jmvc/adobe/account/fixtures/my.info.user.json"
    $.ajax({
        type: 'GET',
        url: url,
        dataType: "json",
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            fillBillingAddressFromUser(data);
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.User);
//xhr.setRequestHeader("Accept-Charset", "UTF-8");
        },
        error: function (data) {
        }
    });
}
function fillBillingAddressFromUser(data) {
    if (data["address.AddressAssigned"]) {
        var companyName = data["address.AddressAssigned"]["address.contact"]["contact.companyName"];
        $("#billing-Company").val(companyName);
        $("#billing-Company-default").val(companyName);
        firstName = data["address.AddressAssigned"]["address.contact"]["contact.firstName"];
        lastName = data["address.AddressAssigned"]["address.contact"]["contact.lastName"];
        $("#billing-FirstName").val(firstName);
        $("#billing-LastName").val(lastName);
        $("#billing-FirstName-default").val(firstName);
        $("#billing-LastName-default").val(lastName);
        $("#" + value + "-Country-default").val($("#Billing-Country-default").val());
        copyBillingToShipping();
    }
}
function savemyaddressbookSection() {
    Adobe.PageInfo.SavingBillingAddress = true;
    Adobe.PageInfo.SavingShippingAddress = true;
    Adobe.PageInfo.SavingShippingMethod = true;
    var country = Adobe.AddressBook.billingAddress.country || Adobe.PageInfo.PageLocale;
    $.each(Adobe.AddressBook.AddressTypes, function (index, value) {
        if (index === 0) {
// Publish event to Omniture SiteCatalyst for metrics reporting
            OpenAjax.hub.publish("account.save_changes.address_book");
        }
        if ($("#shipping-shipToBilling").is(":checked")) {
            Adobe.AddressBook.shipToDifferent = false;
            addressType = "billing";
        }
        else {
            Adobe.AddressBook.shipToDifferent = true;
            addressType = value;
        }
        var firstName = $("#" + addressType + "-FirstName").val() || "",
            lastName = $("#" + addressType + "-LastName").val() || "",
            phone = $("#" + addressType + "-Phone").val() || "",
            company = $("#" + addressType + "-Company").val() || "",
            vat = (!$.isUndefined($("#" + addressType + "-Vat").val())) ? $("#" + addressType + "-Vat").val() : "",
            firstNamePronounce = (!$.isUndefined($("#" + addressType + "-FirstNamePronunciation").val())) ? $("#" + addressType + "-FirstNamePronunciation").val() : "",
            lastNamePronounce = (!$.isUndefined($("#" + addressType + "-LastNamePronunciation").val())) ? $("#" + addressType + "-LastNamePronunciation").val() : "",
            companyNamePronounce = (!$.isUndefined($("#" + addressType + "-CompanyPronunciation").val())) ? $("#" + addressType + "-CompanyPronunciation").val() : "",
            department = (!$.isUndefined($("#" + addressType + "-Department").val())) ? $("#" + addressType + "-Department").val() : "",
            street1 = $("#" + addressType + "-Address").val() || "",
            street2 = $("#" + addressType + "-Address2").val() || "",
            street3 = (!$.isUndefined($("#" + addressType + "-Address3").val())) ? $("#" + addressType + "-Address3").val() : "",
            street4 = (!$.isUndefined($("#" + addressType + "-Address4").val())) ? $("#" + addressType + "-Address4").val() : "",
            city = $("#" + addressType + "-City").val() || "",
            state = $("#" + addressType + "-StateProvince").val() || "",
            country = $("#" + addressType + "-Country-default").val(),
            postalCode = $("#" + addressType + "-PostalCode").val() || "";
        firstNamePronounce = (!undefinedOrEmpty($("#" + addressType + "-FirstNamePronunciation").val()) && firstNamePronounce == "") ? Adobe.AddressBook[addressType + 'Address'].firstNamePronounce : firstNamePronounce;
        lastNamePronounce = (!undefinedOrEmpty($("#" + addressType + "-LastNamePronunciation").val()) && lastNamePronounce == "") ? Adobe.AddressBook[addressType + 'Address'].lastNamePronounce : lastNamePronounce;
        companyNamePronounce = (!undefinedOrEmpty($("#" + addressType + "-CompanyPronunciation").val()) && companyNamePronounce == "") ? Adobe.AddressBook[addressType + 'Address'].companyNamePronounce : companyNamePronounce;
        department = (!undefinedOrEmpty($("#" + addressType + "-Department").val()) && department == "") ? Adobe.AddressBook[addressType + 'Address'].department : department;
        street3 = (!undefinedOrEmpty($("#" + addressType + "-Address3").val()) && street3 == "") ? Adobe.AddressBook[addressType + 'Address'].street3 : street3;
        street4 = (!undefinedOrEmpty($("#" + addressType + "-Address4").val()) && street4 == "") ? Adobe.AddressBook[addressType + 'Address'].street4 : street4;
        vat = (!undefinedOrEmpty($("#" + addressType + "-Vat").val()) && vat == "") ? Adobe.AddressBook[addressType + 'Address'].vat : vat;
        if (country == "JP") {
            postalCode = $("#" + addressType + "-PostalCode1").val() + "-" + $("#" + addressType + "-PostalCode2").val();
            $("#" + addressType + "-PostalCode").val(postalCode)
        }
        xmlToPost = "<AssignedAddress xmlns='http://www.adobe-services.com/2011-06-01/address' " +
            "xmlns:ns2='http://www.adobe-services.com/2011-06-01/contact' " +
            "xmlns:ns3='http://www.adobe-services.com/2011-06-01/references'>" +
            "<contact>" +
            "<ns2:firstName>" + encodeField(firstName) + "</ns2:firstName>" +
            "<ns2:lastName>" + encodeField(lastName) + "</ns2:lastName>" +
            "<ns2:phone>" + encodeField(phone) + "</ns2:phone>" +
            "<ns2:companyName>" + encodeField(company) + "</ns2:companyName>" +
            "<ns2:pronunciation_first_name>" + encodeField(firstNamePronounce) + "</ns2:pronunciation_first_name>" +
            "<ns2:pronunciation_last_name>" + encodeField(lastNamePronounce) + "</ns2:pronunciation_last_name>" +
            "<ns2:pronunciation_company_name>" + encodeField(companyNamePronounce) + "</ns2:pronunciation_company_name>" +
            "<ns2:department>" + encodeField(department) + "</ns2:department>" +
            "<ns2:vat_id>" + encodeField(vat) + "</ns2:vat_id>" +
            "</contact>" +
            "<street1>" + encodeField(street1) + "</street1>" +
            "<street2>" + encodeField(street2) + "</street2>" +
            "<street3>" + encodeField(street3) + "</street3>" +
            "<street4>" + encodeField(street4) + "</street4>" +
            "<city>" + encodeField(city) + "</city>" +
            "<StateProvince><ns3:code>" + state + "</ns3:code></StateProvince>" +
            "<postalCode>" + postalCode + "</postalCode>" +
            "<country>" + "<ns3:iso_3166_alpha2_code>" + getCountry(addressType) + "</ns3:iso_3166_alpha2_code>" + "</country>" +
            "<addressStatus>DEFAULT</addressStatus>" +
            "</AssignedAddress>";
        saveAddress(value, false, xmlToPost);
        if (index == 0) {
            saveShippingMethod();
        } else {
            $("#myaddressbookSection").find(".accountActionButtons").hide();
        }
    });
}
function cancelmyaddressbookSection() {
    if ($("#shipping-shipToDifferent").is(":checked")) {
        $("#shipping-shipToDifferent").attr("checked", "checked");
        $("#shipping-Container").show();
    } else {
        $("#shipping-shipToBilling").attr("checked", "checked");
        $("#shipping-Container").hide();
    }
    setShippingMethodsDropdown();
    resetShippingMethodToDefault();
}
function validatemyaddressbookSection() {
    return true;
}
function presavemyaddressbookSection() {
//if ($("#shipping-shipToBilling").is(":checked")) {
//copyBillingToShipping();
//}
    $("#shipping-Container input, #shipping-Container select").removeClass("AccountFormInputError");
}
function saveAddress(addressType, validateAddress, xmlToPost) {
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/address_book/" + addressType + "_addresses" :
        "/include/jmvc/adobe/account/fixtures/my.info." + addressType + ".update.json"
    $.ajax({
        type: 'POST',
        url: url,
        data: xmlToPost,
        contentType: "application/xml;charset=UTF-8",
        success: function (data) {
            if (data["address.address"]) {
                openAddressCorrectionDialog(addressType, data);
            }
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
//xhr.setRequestHeader("Accept-Charset", "UTF-8");
            if (addressType == "shipping") {
                xhr.setRequestHeader("Authorization", Adobe.Tokens.ShippingAddressUpdate);
            } else if (addressType == "billing") {
                xhr.setRequestHeader("Authorization", Adobe.Tokens.BillingAddressUpdate);
            }
        },
        complete: function () {
            if (addressType == "billing") {
                Adobe.PageInfo.SavingBillingAddress = false;
            } else if (addressType == "shipping") {
                Adobe.PageInfo.SavingShippingAddress = false;
            }
            if (!Adobe.PageInfo.SavingBillingAddress && !Adobe.PageInfo.SavingShippingAddress && !Adobe.PageInfo.SavingShippingMethod) {
                Adobe.Account.UserAccount.UserAccountController.sectionSaved("myaddressbookSection");
            }
        },
        error: function (data) {
            handleAddressError(data);
        },
        dataType: "json",
        async: false
    });
}
function saveShippingMethod() {
    var selectedShippingMethod = getShippingMethodValue();
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/shippingMethods" :
        "/include/jmvc/adobe/account/fixtures/my.info.shipping.methods.update.json";
    $.ajax({
        type: 'POST',
        url: url,
        data: selectedShippingMethod,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.UpdateShippingMethod);
//xhr.setRequestHeader("Accept-Charset", "UTF-8");
        },
        complete: function () {
            Adobe.PageInfo.SavingShippingMethod = false;
            if (!Adobe.PageInfo.SavingBillingAddress && !Adobe.PageInfo.SavingShippingAddress && !Adobe.PageInfo.SavingShippingMethod) {
                Adobe.Account.UserAccount.UserAccountController.sectionSaved("myaddressbookSection");
            }
        },
        contentType: "text/plain"
    });
    $("#DefaultShippingMethod-default").val(selectedShippingMethod);
}
function setShippingMethod(shippingData) {
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/shippingMethods" :
        "/include/jmvc/adobe/account/fixtures/my.info.shipping.methods.json";
    $.ajax({
        type: 'GET',
        url: url,
        success: function (data) {
            var shippingMethod = (data != undefined) ? data : "";
            buildShippingMethodList(shippingData, shippingMethod)
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.ShippingMethod);
//xhr.setRequestHeader("Accept-Charset", "UTF-8");
        },
        error: function () {
            buildShippingMethodList(shippingData)
        },
        complete: function () {
            var accountController = Adobe.Account.UserAccount.UserAccountController;
            accountController.initialServiceCalls.shippingMethod = true;
            if (accountController.checkFullyLoaded()) {
                myInfoMask.showContent();
            }
        },
        contentType: "application/xml;charset=UTF-8"
    });
}
function buildShippingMethodList(shippingData, shippingMethod) {
    var markup = "",
        labels = Adobe.AddressBook.ShippingMethod.Labels;
    if (shippingData) {
        if (shippingMethod == undefined || shippingMethod == "") {
            shippingMethod = "";
        }
        var first = $("#DefaultShippingMethod option:first");
        if (Adobe.AddressBook.shippingMethodsInitiliazed) {
            $("#DefaultShippingMethod").empty().append(first);
        }
        $.each(shippingData, function (index, value) {
            var code = value["shippingCarrierInfo.carrierCode"],
                name = value["shippingCarrierInfo.carrierName"];
            markup += '<option value="' + code;
            markup += code == shippingMethod ? '" selected="selected">' : '">';
            markup += name;
            markup += '</option>';
        })
        $("#shipping-StateProvince").removeAttr("disabled");
        $("#billing-StateProvince").removeAttr("disabled");
        $("#DefaultShippingMethod").append(markup)
        $("#DefaultShippingMethod-default").val(shippingMethod);
    } else {
        $("#DefaultShippingSection").hide();
    }
}
function setStateListBindings() {
    $("#billing-StateProvince").change(function (event) {
        setShippingMethodsDropdown('billing');
    });
    $("#shipping-StateProvince").change(function (event) {
        setShippingMethodsDropdown('shipping');
    });
}
function setShippingMethodsDropdown(type) {
    if ((type == "billing" && $("#shipping-shipToDifferent").is(":checked")) || Adobe.PageInfo.MaxShipChange >= 3) {
        return;
    }
    var whichAddress = (type == "billing" && $("#shipping-shipToBilling").is(":checked")) ? "billing" : "shipping",
        addressData = (type == "billing") ? Adobe.AddressBook.billingAddress : Adobe.AddressBook.shippingAddress,
        country = addressData.country || Adobe.PageInfo.PageLocale,
        stateValue = $("#" + whichAddress + "-StateProvince").val();
    if (Adobe.AddressBook.shippingMethodsInitiliazed && country != "US" || stateValue == "") return; // don't update shipping methods unless country is US : ALM #5780
    if (Adobe.AddressBook.shippingMethodsInitiliazed) {
        $("#" + whichAddress + "-StateProvince").attr("disabled", "disabled");
        getShippingMethods(whichAddress)
    } else {
        Adobe.AddressBook.shippingMethodsInitiliazed = true;
    }
}
function getShippingMethods(addressType) {
    var host = window.location.hostname,
        tokens = Adobe.Tokens || {},
        token = tokens.References,
        addressData = (addressType == "billing") ? Adobe.AddressBook.billingAddress : Adobe.AddressBook.shippingAddress,
        state = (addressType == "billing") ? $("#billing-StateProvince").val() : $("#shipping-StateProvince").val(),
        country = addressData.country || Adobe.PageInfo.PageLocale,
        state = (state == "") ? "" : state,
        locale = Adobe.PageInfo.AcceptLanguage;
    $.ajax({
        url: (host == "jmvc.adobe.com") ? "/include/jmvc/adobe/account/fixtures/my.info.uk.references.json" : "/svcs/references",
        type: 'get',
        data: 'locale=' + locale + 'marketSegment=' + "COM" + '&country=' + country + '&state=' + state,
        dataType: 'json',
        headers: { "Authorization": token, "Accept": "application/vnd.Adobeservices.reference.2012-05-01+json" },
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            var countries = data["reference.reference"]["reference.sales_regions"][0]["reference.countries"];
            $.each(countries, function (index, value) {
                if (country == countries[index]["reference.iso_3166_alpha2_code"]) {
                    setShippingMethod(countries[index]["reference.shipping_carrier_info"]);
                }
            });
            Adobe.PageInfo.MaxShipChange++
        },
        error: function (data) {
            $("#shipping-StateProvince").removeAttr("disabled");
            $("#billing-StateProvince").removeAttr("disabled");
            return;
        }
    });
}
function getShippingMethodValue() {
    var selectedShippingMethod;
    var whichAddress = "shipping";
    if ($("#shipping-shipToBilling").is(":checked")) {
        whichAddress = "billing";
    }
    var countryCodeToUse = Adobe.PageInfo.PageLocale;
    var stateCodeToUse = $("#" + whichAddress + "-StateProvince").val();
    var contUS = $.inArray(stateCodeToUse, Adobe.AddressBook.USshippingMethodRegions) == -1;
    if (countryCodeToUse === "US" && !contUS) {
        selectedShippingMethod = $("#DefaultShippingMethod").val();
    } else {
        selectedShippingMethod = $("#DefaultShippingMethod").val();
    }
    return selectedShippingMethod;
}
function resetShippingMethodToDefault() {
    $(".shippingMethodDropDown [value='" + $("#DefaultShippingMethod-default").val() + "']").attr('selected', true);
};
function openAddressCorrectionDialog(addressType, data) {
    clearAddressEntries();
    fillinAddressEntries(data, addressType);
    $("#addressVerificationDialog").dialog({
        title: "[" + capitaliseFirstLetter(addressType) + "] " + $("#addressVerificationTitle").text()
    });
    compareAddresses();
    $("#addressVerificationDialog").dialog("open");
}
function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function clearAddressEntries() {
    $("#addressEntered li span").html("");
    $("#addressSuggestion li span").html("");
    $("#addressSuggestion li span").removeClass("CartFormError");
}
function fillinAddressEntries(data, addressType) {
    $("#addressEntered li span.addressVerify-Street1").text($("#" + addressType + "-Address").val());
    $("#addressEntered li span.addressVerify-Street2").text($("#" + addressType + "-Address2").val());
    $("#addressEntered li span.addressVerify-City").text($("#" + addressType + "-City").val());
    $("#addressEntered li span.addressVerify-StateProvince").text($("#" + addressType + "-StateProvince").val());
    $("#addressEntered li span.addressVerify-PostalCode").text($("#" + addressType + "-PostalCode").val());
    $("#addressEntered li span.addressVerify-Country").text($("#" + addressType + "-Country").val());
    $("#addressSuggestion li span.addressVerify-Street1").text(data["address.address"]["address.street1"]);
    $("#addressSuggestion li span.addressVerify-Street2").text(data["address.address"]["address.street2"]);
    $("#addressSuggestion li span.addressVerify-City").text(data["address.address"]["address.city"]);
    $("#addressSuggestion li span.addressVerify-StateProvince").text(data["address.address"]["address.StateProvince"]["reference.code"]);
    $("#addressSuggestion li span.addressVerify-PostalCode").text(data["address.address"]["address.postalCode"]);
    $("#addressSuggestion li span.addressVerify-Country").text(data["address.address"]["address.country"]["reference.iso_3166_alpha2_code"]);
}
function compareAddresses() {
    $.each($("#addressSuggestion li span"), function (index, value) {
        if ($(value).text() != $("#addressEntered li span." + $(value).attr("class")).text()) {
            $(value).addClass("CartFormError");
        }
    });
}
function limitInputs() {
    $('#billing-PostalCode,#shipping-PostalCode').keydown(function (e) {
        var id = $(e.target).attr("id").replace("PostalCode", "");
        if ($("#" + id + "Country-default").val() == "CA" || $("#" + id + "Country-default").val() == "GB" || $("#" + id + "Country-default").val() == "UK") {
            if (!(isAlphabetic(e) || isNumeric(e) || (e.keyCode == 32) || isNavigational(e))) {
                return false;
            }
        } else {
            if (!(isNumeric(e) || isNavigational(e))) {
                return false;
            }
        }
    });
    $('#billing-Phone,#shipping-Phone').keydown(function (e) {
        if (!(isNumeric(e) || (e.keyCode == 32) || isNavigational(e))) {
            return false;
        }
    });
}
function isNumeric(e) {
    return ( (e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105) );
}
function isAlphaNumeric(e) {
    return (isAlphabetic(e) || isNumeric(e));
}
function isAlphabetic(e) {
    return (e.keyCode >= 65 && e.keyCode <= 90);
}
function isNavigational(e) {
//these are tab, arrow keys, end and home.
    return ( (e.keyCode >= 35 && e.keyCode <= 40) || (e.keyCode == 8) || (e.keyCode == 109) || (e.keyCode == 9) || (e.keyCode == 18) || (e.keyCode == 46) );
}
function undefinedOrEmpty(thisVar) {
    if (typeof thisVar == 'undefined' || thisVar == "") {
        return true;
    } else {
        return false;
    }
}
function objectsEqual(obj1, obj2) {
    areEqual = false;
    if (!undefinedOrEmpty(obj1) && !undefinedOrEmpty(obj2) && (obj1.length == obj2.length)) {
        areEqual = true;
        $.each(obj1, function (index, value) {
            if (obj1[index] != obj2[index]) {
                areEqual = false;
            }
        });
    }
    return areEqual;
}
OpenAjax.hub.subscribe('addressServiceReturned', function (event, addressType) {
    if (addressType === "billing") {
        Adobe.AddressBook.billingset = true;
    } else if (addressType === "shipping") {
        Adobe.AddressBook.shippingset = true;
    }
    if (Adobe.AddressBook.shippingset && Adobe.AddressBook.billingset) {
        OpenAjax.hub.publish('addressesReturned');
    }
});
OpenAjax.hub.subscribe('addressesReturned', function (event) {
    if (!Adobe.AddressBook.shippingMethodsInitiliazed) {
        setShippingMethodsDropdown();
    }
});
function encodeField(field) {
    return field.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\//g, "%30").replace(/&/g, "&amp;")
}
function decodeField(field) {
    return decodeURI(field).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
};
// checks that an input string looks like a valid email address.
var isEmail_re = /^[a-zA-Z0-9\#\$\%\?\\\'\+\-\=\_\.]{1,}@((\[([0-9]{1,3}\.){3}[0-9]{1,3}\])|(([\w\-]+\.)+)([a-zA-Z]{2,4}))$/;
function isEmail(s) {
    return String(s).search(isEmail_re) != -1;
}
if (!Adobe.PageInfo) {
    Adobe.PageInfo = {};
}
var SCREENNAME = $.cookie('SCREENNAME');
var WCDServer = $.cookie('WCDServer');
var primaryContactPhone;
var primaryContactFirstName;
var primaryContactLastName;
Adobe.PageInfo.SavingAdobeId = false;
Adobe.PageInfo.SavingPassword = false;
Adobe.PageInfo.SavingAlternateEmail = false;
var passwordLengthErrorTooFew = false;
var passwordLengthErrorTooMany = false;
var validatedAdobeID;
$(document).ready(function () {
    $('#AdobeId, #AlternateEmail').blur(function () {
        var myMailcheckElement = "#" + this.id,
            myMailcheckSuggestedEmail = "#" + this.id + "-suggestedEmail",
            myMailcheckSuggestion = "#" + this.id + "-suggestion",
            myMailCheckClose = "#" + this.id + "-close";
        $(this).mailcheck({
            suggested: function (element, suggestion) {
                $(myMailcheckSuggestedEmail).text(suggestion.full);
                $(myMailcheckSuggestedEmail).bind('click', function (event) {
                    event.preventDefault();
                    $(myMailcheckElement).val(suggestion.full);
                    $(myMailcheckSuggestion).addClass("LayoutHidden");
                    $(myMailcheckSuggestedEmail).unbind('click');
                    $("#myadobeidSection").find(".accountActionButtons").show("slow");
                    if (myMailcheckElement == "#AdobeId") {
                        adobeIdChanged();
                    }
                    else {
                        alternateEmailChanged();
                        if (alternateEmailIsValid()) {
                            Adobe.PageInfo.SavingAlternateEmail = true;
                        }
                    }
                });
                $(myMailCheckClose).bind('click', function (event) {
                    $(myMailcheckSuggestion).addClass("LayoutHidden");
                });
                $(myMailcheckSuggestion).removeClass("LayoutHidden");
            },
            empty: function (element) {
                $(myMailcheckSuggestion).addClass("LayoutHidden");
                $(myMailcheckSuggestedEmail).unbind('click');
            }
        });
    });
    initAdobeID();
});
function initAdobeID() {
    OpenAjax.hub.subscribe('sso.ready', function (event, sso) {
        if (sso.cayenneAuthenticated()) {
            myInfoMask = $("#LayoutBody-Content").view_mask({maskAlpha: .8, maskZIndex: 3}).controller();
            myadobeidSectionMask = $("#myadobeidSection").view_mask({maskAlpha: .8}).controller();
            var url = (Adobe.PageInfo.isJSP == undefined) ? "/svcs/accounts/" + sso.GUID() + "/contact" : "/include/jmvc/adobe/account/fixtures/my.info.contact.json"
            $.ajax({
                type: 'GET',
                url: url,
                dataType: "json",
                contentType: "application/vnd.Adobeservices.Contact.2012-05-01+json;charset=UTF-8",
                success: function (data) {
                    fillAdobeId(data);
                },
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("x-adobe-authorization", WCDServer);
                    xhr.setRequestHeader("Authorization", Adobe.Tokens.Contact);
                    xhr.setRequestHeader("Accept", "application/vnd.Adobeservices.Contact.2012-05-01+json");
                    xhr.setRequestHeader("Accept-Language", Adobe.PageInfo.AcceptLanguage);
                },
                error: function (data) {
                    accountController.fillDefaults("myadobeidSection");
                },
                complete: function () {
                    var accountController = Adobe.Account.UserAccount.UserAccountController;
                    accountController.initialServiceCalls.contact = true;
                    if (accountController.checkFullyLoaded()) {
                        myInfoMask.showContent();
                    }
                }
            });
        } else {
            sso.redirectToLogin()
        }
    });
    bindFocusOfPasswordTextFields();
    bindBlurOfPasswordFields();
    $("#AdobeId").focus(function (e) {
        $("#AdobeId-greenCheck").hide();
    });
    $("#AdobeId").focusout(function (e) {
        e.preventDefault();
        if ($("#AdobeId").val() != $("#AdobeId-default").val()) {
            Adobe.Account.UserAccount.UserAccountController.unbindSave["myadobeidSection"] = true;
        }
    });
    $("#AlternateEmail").focus(function (e) {
        $("#AlternateEmail-greenCheck").hide();
    });
    $("#AlternateEmail").change(function (e) {
        if (alternateEmailIsValid()) {
            Adobe.PageInfo.SavingAlternateEmail = true;
        }
    });
    $("#myadobeidForm").submit(function (event) {
        event.preventDefault();
    });
}
function validatePasswords(e) {
    $("#CurrentPasswordInfo span.AccountFormError").hide();
    inputId = $(e.target).attr("id").replace("Masked", "");
    if ($.trim($(e.target).val()).length == 0) {
        $(e.target).hide();
        $("#" + inputId).show();
        clearAdobeIdFormError(inputId);
    } else {
        if ($("#NewPasswordMasked").val() && $("#NewPasswordMasked").val().length > 0 && $("#NewPasswordMasked").val().length < 6) {
            passwordLengthErrorTooFew = true;
            setAdobeIdFormError("NewPassword");
            hidePasswordsSameError();
        } else if ($("#NewPasswordMasked").val() && $("#NewPasswordMasked").val().length > 0 && $("#NewPasswordMasked").val().length > 100) {
            passwordLengthErrorTooMany = true;
            setAdobeIdFormError("NewPassword");
            hidePasswordsSameError();
        } else {
            clearAdobeIdFormError("NewPassword");
//Do not want to display both errors - so nested if
            if (newAndCurrentPasswordsDiffer()) {
                hidePasswordsSameError();
            } else {
                displayPasswordsSameError();
            }
        }
        if ($("#VerifyNewPasswordMasked").val() && $("#VerifyNewPasswordMasked").val().length > 0 && $("#NewPasswordMasked").val() != $("#VerifyNewPasswordMasked").val()) {
            setAdobeIdFormError("VerifyNewPassword");
        } else {
            clearAdobeIdFormError("VerifyNewPassword");
        }
    }
}
function adobeIdChanged() {
    validatedAdobeID = false;
    adobeIdBlankMessage("hide");
    Adobe.Account.UserAccount.UserAccountController.unbindSave["myadobeidSection"] = true;
    if ($("#AdobeId").val() == $("#AdobeId-default").val()) {
    } else if (validateEmail($("#AdobeId").val())) {
        getAccountStatusToken($("#AdobeId").val());
    } else if (($("#AdobeId").attr("id") == "AdobeId" && $("#AdobeId").val().length == 0) || !validateEmail($("#AdobeId").val())) {
//setAdobeIdIndicator(true);
        adobeIdBlankMessage("show");
    } else {
//sets indicator that entered adobe id is invalid
//not a valid email address
//setAdobeIdIndicator(true);
    }
}
function alternateEmailChanged() {
    setAlternateEmailIndicator(false)
    var altEmail = Adobe.PageInfo.Contact["contact.contact"]["contact.secondaryEmail"];
    if (validateEmail($("#AlternateEmail").val()) || ($("#AlternateEmail").val().length == 0 && altEmail == "")) {
        alternateEmailError("hide");
    } else {
//sets indicator that entered alternate email id is invalid
        setAlternateEmailIndicator("show");
    }
}
function savemyadobeidSection() {
    /*
     * Set PageInfo variables SavingAdobeId and SavingPassword
     * So we can track easily if the services are both updated simultaneously
     * when both have successfully returned for hiding and showing buttons.
     */
    $(".IconGreenCheck").hide();
    if (adobeIdIsValid()) {
        Adobe.PageInfo.SavingAdobeId = true;
    }
    if (formValidated()) {
        Adobe.PageInfo.SavingPassword = true;
    }
    if (Adobe.PageInfo.SavingAdobeId && Adobe.PageInfo.SavingPassword) {
        updateAdobeId();
        updatePassword();
    }
    else if (Adobe.PageInfo.SavingAdobeId) {
        updateAdobeId();
    }
    else if (Adobe.PageInfo.SavingPassword) {
        updatePassword();
    }
    if (Adobe.PageInfo.SavingAlternateEmail) {
        updateAlternateEmail();
    }
}
function cancelmyadobeidSection() {
    hidePasswordsSameError();
    $("#myadobeidForm input:password").val("");
    $("#myadobeidForm input:password").hide();
    $("#myadobeidForm input:text").show();
}
function validatemyadobeidSection() {
    adobeIdSectionValid = true;
    return adobeIdSectionValid;
}
function updateAdobeId() {
    xmlToPost = adobeIdXml();
// Publish event to Omniture SiteCatalyst for metrics reporting
    OpenAjax.hub.publish("account.save_changes.adobe_id");
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/authentication/" + $("#AdobeId").val() + "/change_adobeid" :
        "/include/jmvc/adobe/account/fixtures/my.info.update.adobeid.success.json"
    $.ajax({
        type: 'POST',
        url: url,
//data: xmlToPost,
        contentType: "application/xml",
        success: function (data) {
            if (data.Result.message.indexOf("ERROR") > -1) {
                handleUpdateIdError(data);
            } else {
                handleUpdateIdSuccess(data);
            }
        },
        complete: function () {
            Adobe.PageInfo.SavingAdobeId = false;
            if (!Adobe.PageInfo.SavingAdobeId && !Adobe.PageInfo.SavingPassword) {
                Adobe.Account.UserAccount.UserAccountController.sectionSaved("myadobeidSection");
            }
            $(".VerifyEmailSuccessMsg").hide()
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.ChangeAdobeId);
            xhr.setRequestHeader("Accept-Language", Adobe.PageInfo.AcceptLanguage);
        },
        error: function (data) {
//handleAdobeIdError(data);
        },
        dataType: "json"
    });
}
function updateAlternateEmail() {
// Publish event to Omniture SiteCatalyst for metrics reporting
//OpenAjax.hub.publish("account.save_changes.alternate_email");
    var url = (Adobe.PageInfo.isJSP == undefined) ? "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/contact" : "/include/jmvc/adobe/account/fixtures/my.info.update.contact.json"
    var original = Adobe.PageInfo.Contact["contact.contact"]["contact.secondaryEmail"];
    Adobe.PageInfo.Contact["contact.contact"]["contact.secondaryEmail"] = $("#AlternateEmail").val();
// cannot send these values or else it will cause a 500 error
    delete Adobe.PageInfo.Contact["contact.contact"]["contact.main_email"];
    delete Adobe.PageInfo.Contact["contact.contact"]["contact.alternate_email"];
    $.ajax({
        type: 'POST',
        url: url,
        data: $.toJSON(Adobe.PageInfo.Contact),
        dataType: "json",
        contentType: "application/json;charset=UTF-8",
        accept: "json",
        success: function (data) {
            if ($("#AlternateEmail").val() != "") {
                $("#AltEmailVerified").hide(); // hide green bubble
                $("#AlternateEmail-greenCheck").show();
                $("#VerifyAltEmail").show();
                $("#VerifyAltEmailLink").click(function (e) {
                    e.preventDefault();
                    verifyAltEmail(e);
                })
                $("#AltEmailVerificationMessage").html(Adobe.PageInfo.Labels.ALT_EMAIL_NOT_VERIFIED); // Prepends text to modal window content
            } else {
                $("#VerifyAltEmail").hide();
            }
            Adobe.PageInfo.SavingAlternateEmail = false;
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.UpdateContact);
            xhr.setRequestHeader("Accept-Language", Adobe.PageInfo.AcceptLanguage);
        },
        error: function (data) {
            var errorCode = data.getResponseHeader("x-adobe-status"),
                errorMsg = (Adobe.PageInfo.Labels[errorCode] != undefined) ? Adobe.PageInfo.Labels[errorCode] : Adobe.PageInfo.Labels["INVALID_EMAIL_FORMAT"];
            if (errorCode == "1401f" || data.status == "500") {
                return;
            }
            $("#AlternateEmail").addClass("AccountFormInputError");
            $("#AlternateEmail-error").html(errorMsg).show();
            $("#AlternateEmail").keyup(function (e) {
                $("#AlternateEmail-greenCheck").hide();
                $("#AlternateEmail").removeClass("AccountFormInputError");
                $("#AlternateEmail-error").hide();
            });
        },
        complete: function (data) {
            Adobe.PageInfo.SavingAlternateEmail = false;
            if (!Adobe.PageInfo.SavingAdobeId && !Adobe.PageInfo.SavingPassword) {
                Adobe.Account.UserAccount.UserAccountController.sectionSaved("myadobeidSection");
            }
            if (data.status == 400) {
                $("#AlternateEmail-default").val(original);
                var errorDefault = $("#AlternateEmail").val();
                $("#AlternateEmail").val(errorDefault);
            }
            $(".VerifyEmailSuccessMsg").hide()
        }
    });
}
function updatePassword() {
// Publish event to Omniture SiteCatalyst for metrics reporting
    OpenAjax.hub.publish('myadobeidSection_hide');
    OpenAjax.hub.publish("account.save_changes.adobe_id");
    currentForm = $("#myadobeidForm").serialize();
    var isUpdated = true;
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/authentication/" + Adobe.Sso.SsoController.GUID() + "/change_password" :
        "/include/jmvc/adobe/account/fixtures/my.info.update.password.success.json"
    $.ajax({
        type: 'POST',
        url: url,
        data: currentForm,
        success: function (data) {
            handleUpdatePasswordSuccess(data);
        },
        complete: function () {
            Adobe.PageInfo.SavingPassword = false;
            if (!Adobe.PageInfo.SavingAdobeId && !Adobe.PageInfo.SavingPassword) {
                Adobe.Account.UserAccount.UserAccountController.sectionSaved("myadobeidSection");
            }
            $(".VerifyEmailSuccessMsg").hide()
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.ChangePassword);
        },
        error: function (data) {
            handleUpdatePasswordError(data);
        }
    });
}
function adobeIdXml() {
    xmlToPost = "<Contact xmlns='http://www.adobe-services.com/2011-06-01/contact'>" +
// "<firstName>"+primaryContactFirstName+"</firstName>" +
// "<lastName>"+primaryContactLastName+"</lastName>" +
// "<phone>"+primaryContactPhone+"</phone>" +
        "<primaryEmail>" + $("#AdobeId").val() + "</primaryEmail>" +
// "<secondaryEmail></secondaryEmail>" +
        "</Contact>";
    return xmlToPost;
}
function handleUpdateIdSuccess(data) {
    if (data.Result.message.indexOf("renga") == 0) {
        $.cookies.set("WCDServer", data.Result.message, {domain: ".adobe.com"});//Added domain to fix HP QC Defect # 2247
        $("#AdobeId-default").val($("#AdobeId").val());
        $("#AdobeId-greenCheck").show();
        $("#EmailVerified").hide(); // hide green bubble
        $("#VerifyEmail").show();
        $("#VerifyEmailLink").click(function (e) {
            e.preventDefault();
            verifyEmail(e);
        })
        $("#EmailVerificationMessage").html(Adobe.PageInfo.Labels.NOT_VERIFIED); // Prepends text to modal window content
    }
}
function handleUpdateIdError(data) {
    $("#AdobeId-greenCheck").hide();
    if (!$("#AdobeId").hasClass("AccountFormInputError")) {
        $("#AdobeId").addClass("AccountFormInputError");
    }
    $("#AdobeId-error").show();
}
function handleUpdatePasswordSuccess(data) {
    if (data.Result.message.indexOf("renga") == 0) {
        $("#CurrentPasswordInfo span.AccountFormError").hide();
        $.cookies.set("WCDServer", data.Result.message, {domain: ".adobe.com"});//Added domain to fix HP QC Defect # 2247
        $("#VerifyNewPasswordInfo span.IconGreenCheck").show();
        swapFields("#VerifyNewPassword");
        $("#NewPasswordInfo span.IconGreenCheck").show();
        swapFields("#NewPassword");
        $("#CurrentPasswordInfo span.IconGreenCheck").show();
        swapFields("#CurrentPassword");
        WCDServer = data.Result.message;
        $("#myadobeidSection").find(".accountActionButtons").hide();
    } else if (data.Result.message == "INVALID_PASSWORD") {
        $("#CurrentPasswordInfo span.AccountFormError").show();
    }
}
function handleUpdatePasswordError(data) {
    if (data.Result.message == "Same Password") {
        $("#CurrentPasswordInfo span.AccountFormError").hide();
        $("#VerifyNewPasswordInfo span.IconGreenCheck").show();
        $("#NewPasswordInfo span.IconGreenCheck").show();
        $("#CurrentPasswordInfo span.IconGreenCheck").show();
        $("#myadobeidSection").find(".accountActionButtons").hide();
    } else if (data.Result.message == "UPDATE_FAILED") {
    } else if (data.Result.message == "INVALID_PASSWORD") {
        $("#CurrentPasswordInfo span.AccountFormError").show();
    }
}
function fillAdobeId(data) {
    Adobe.PageInfo.Contact = data;
    var contactData = data["contact.contact"],
        primaryEmail = contactData["contact.primaryEmail"],
        secondaryEmail = contactData["contact.secondaryEmail"],
        mainEmail = contactData["contact.main_email"]["contact.value"],
        mainEmailStatus = contactData["contact.main_email"]["contact.status"],
        alternateEmail = contactData["contact.alternate_email"]["contact.value"],
        alternateEmailStatus = contactData["contact.alternate_email"]["contact.status"];
    if (primaryEmail) {
        $("#AdobeId").val(primaryEmail);
        $("#AdobeId-default").val(primaryEmail);
    } else {
        $("#AdobeId").val($("#AdobeId-default").val());
    }
    if (mainEmailStatus && mainEmailStatus == "VERIFIED") {
        $("#EmailVerified").show(); // show green bubble
        $("#EmailVerificationMessage").html(Adobe.PageInfo.Labels.VERIFIED); // Prepends text to modal window content telling about how email verification is important
    } else {
        $("#VerifyEmail").show();
        $("#EmailVerificationMessage").html(Adobe.PageInfo.Labels.NOT_VERIFIED); // Prepends text to modal window content
        $("#VerifyEmailLink").click(function (e) {
            e.preventDefault();
            verifyEmail(e);
        })
    }
    $(".VerifyHelp").click(function (e) {
        e.preventDefault();
        $(".WhatIsThisTip").toggle();
    })
    $(".VerifyAltEmailHelp").click(function (e) {
        e.preventDefault();
        $(".WhatIsThisTipAltEmail").toggle();
    })
    $("#CloseVerifyEmail").click(function (e) {
        e.preventDefault();
        $(".WhatIsThisTip").toggle();
    })
    $("#CloseAltEmail").click(function (e) {
        e.preventDefault();
        $(".WhatIsThisTipAltEmail").toggle();
    })
    if (secondaryEmail) {
        $("#AlternateEmail").val(secondaryEmail);
        $("#AlternateEmail-default").val(secondaryEmail);
    } else {
        $("#AlternateEmail").val($("#AlternateEmail-default").val());
    }
    if (alternateEmailStatus && alternateEmailStatus == "VERIFIED") {
        $("#AltEmailVerified").show(); // show green bubble
        $("#AltEmailVerificationMessage").html(Adobe.PageInfo.Labels.ALT_EMAIL_VERIFIED); // Prepends text to modal window content telling about how email verification is important
    } else {
        if (alternateEmail == "") return;
        $("#VerifyAltEmail").show();
        $("#AltEmailVerificationMessage").html(Adobe.PageInfo.Labels.ALT_EMAIL_NOT_VERIFIED); // Prepends text to modal window content
        $("#VerifyAltEmailLink").click(function (e) {
            e.preventDefault();
            verifyAltEmail(e);
        })
    }
}
function verifyEmail(e) {
    maskmyadobeidSection();
    var url = (Adobe.PageInfo.isJSP == undefined) ? "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/main_email/status" : "/include/jmvc/adobe/account/fixtures/my.info.email.status.txt"
    $.ajax({
        type: 'GET',
        url: url,
        success: function (data) {
            showmyadobeidSection();
            if (Adobe.PageInfo.Labels[data]) {
                if (data == "VERIFIED") {
                    $("#EmailVerified").show();
                    $("#VerifyEmail").hide();
                } else {
                    $("#VerifyCheckEmail").html(Adobe.PageInfo.Labels[data]).addClass("TextEm TextWarning").show();
                }
            }
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", Adobe.Tokens.VerifyEmailAddress);
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Accept-Language", Adobe.PageInfo.AcceptLanguage);
        },
        error: function (data) {
            if (data.status >= 400) {
                $("#VerifyCheckEmail").html(Adobe.PageInfo.Labels['VERIFY_ERROR']).addClass("TextEm TextWarning");
            }
        },
        complete: function (data) {
            showmyadobeidSection();
        }
    });
}
function verifyAltEmail(e) {
    maskmyadobeidSection();
    var url = (Adobe.PageInfo.isJSP == undefined) ? "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/alternate_email/status" : "/include/jmvc/adobe/account/fixtures/my.info.email.status.txt"
    $.ajax({
        type: 'GET',
        url: url,
        success: function (data) {
            showmyadobeidSection();
            if (Adobe.PageInfo.Labels[data]) {
                if (data == "VERIFIED") {
                    $("#AltEmailVerified").show();
                    $("#VerifyAltEmail").hide();
                } else {
                    $("#VerifyCheckAltEmail").html(Adobe.PageInfo.Labels[data]).addClass("TextEm TextWarning").show();
                }
            }
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", Adobe.Tokens.VerifyAltEmailAddress);
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Accept-Language", Adobe.PageInfo.AcceptLanguage);
        },
        error: function (data) {
            if (data.status >= 400) {
                $("#VerifyCheckAltEmail").html(Adobe.PageInfo.Labels['ALT_EMAIL_VERIFY_ERROR']).addClass("TextEm TextWarning");
            }
        },
        complete: function (data) {
            showmyadobeidSection();
        }
    });
}
function formValidated() {
    adobeIdFormReady = true;
    if ($("#NewPasswordMasked").val() == "" || $("#VerifyNewPasswordMasked").val() == "" || $("#CurrentPasswordMasked").val() == "") {
        adobeIdFormReady = false;
    } else if ($("#myadobeidForm .AccountFormError:visible").length > 0) {
        adobeIdFormReady = false;
    }
    return adobeIdFormReady;
}
function setAdobeIdFormError(elId) {
    $("#myadobeidSection .IconGreenCheck").hide();
    if (passwordLengthErrorTooFew == true) {
        $("#newPasswordErrorTooFew").show();
        $("#newPasswordErrorTooMany").hide();
    }
    else if (passwordLengthErrorTooMany == true) {
        $("#newPasswordErrorTooMany").show();
        $("#newPasswordErrorTooFew").hide();
    }
    passwordLengthErrorTooFew = false;
    passwordLengthErrorTooMany = false;
    if (!$("#" + elId + "Masked").hasClass("AccountFormInputError")) {
        $("#" + elId + "Masked").addClass("AccountFormInputError");
    }
    $("#" + elId + "Info span.AccountFormError").show();
}
function clearAdobeIdFormError(elId) {
    $("#" + elId + "Masked").removeClass("AccountFormInputError");
    $("#" + elId + "Info span.AccountFormError").hide();
}
function getAccountStatusToken(email) {
    $.get("/content/dotcom/en/account/account-information/token.accountstatus.html?email=" + email, function (data) {
        $("body").append($(data))
        $(data).attr('id', 'accountStatusTokenGen');
        validateAdobeId(email);
    });
}
function validateAdobeId(email) {
    $.ajax({
        type: 'GET',
        url: "/svcs/accounts/accountstatus/" + email,
        contentType: 'application/json',
        success: function (data, status, xhr) {
            var status = xhr.getResponseHeader("x-adobe-status");
            if (status != "ID_NOT_IN_USE") {
                setAdobeIdIndicator(true);
            } else {
                setAdobeIdIndicator(false);
                validatedAdobeID = true;
            }
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", Adobe.Tokens.AccountStatus);
            xhr.setRequestHeader("Accept", "application/json");
        },
        error: function (data) {
            var status = data.getResponseHeader("x-adobe-status");
            if (status != "ID_NOT_IN_USE") {
                setAdobeIdIndicator(true);
            } else {
                setAdobeIdIndicator(false);
            }
        }
    });
}
function adobeIdIsValid() {
    if ($("#AdobeId").hasClass("AccountFormInputError") || $("#AdobeId-error:visible").length > 0 || $("#AdobeId").val() == $("#AdobeId-default").val()) {
        return false;
    } else {
        return true;
    }
}
function alternateEmailIsValid() {
    if ($("#AlternateEmail").hasClass("AccountFormInputError") || $("#AdobeId-error:visible").length != 0) {
        return false;
    } else {
        return true;
    }
}
function setAdobeIdIndicator(validAdobeId) {
    $("#AdobeId").removeClass("AccountFormInputError");
    $("#AdobeId-error").hide();
    if (validAdobeId) {
        if (!$("#AdobeId").hasClass("AccountFormInputError")) {
            $("#AdobeId").addClass("AccountFormInputError");
        }
        $("#AdobeId-error").show();
    } else {
        validatedAdobeID = true;
    }
    if (validatedAdobeID) {
        var event = {
            target: $('#AdobeId')
        }
        if (!Adobe.Account.UserAccount.UserAccountController.hasErrors('myadobeidSection')) {
            Adobe.Account.UserAccount.UserAccountController.showSaveCancelButtons(event);
            Adobe.Account.UserAccount.UserAccountController.enableSaveButton('myadobeidSection');
        }
    } else {
        Adobe.Account.UserAccount.UserAccountController.disableSaveButton('myadobeidSection');
    }
}
function setAlternateEmailIndicator(validAltEmail) {
    $("#AlternateEmail").removeClass("AccountFormInputError");
    $("#AlternateEmail-error").hide();
    var altEmail = Adobe.PageInfo.Contact["contact.contact"]["contact.secondaryEmail"],
        message = ($("#AlternateEmail").val().length == 0 && altEmail != "") ? Adobe.PageInfo.Labels["EMPTY_EMAIL_ADDRESS"] : Adobe.PageInfo.Labels["INVALID_EMAIL_FORMAT"];
    if (validAltEmail) {
        if (!$("#AlternateEmail").hasClass("AccountFormInputError")) {
            $("#AlternateEmail").addClass("AccountFormInputError");
        }
        $("#AlternateEmail-error").html(message).show();
    }
//Adobe.Account.UserAccount.UserAccountController.toggleSaveButton("myadobeidSection");
}
function newAndCurrentPasswordsDiffer() {
    passwordsDiffer = true;
    if ($.trim($("#NewPasswordMasked").val()) == $.trim($("#CurrentPasswordMasked").val())) {
        passwordsDiffer = false;
    }
    return passwordsDiffer;
}
function displayPasswordsSameError() {
    if (!$("#NewPasswordMasked").hasClass("AccountFormInputError")) {
        $("#NewPasswordMasked").addClass("AccountFormInputError");
    }
    $("#SamePassword-error").show();
}
function hidePasswordsSameError() {
    $("#SamePassword-error").hide();
}
function swapFields(input) {
    $(input + "Masked").val("").hide();
    $(input).show();
}
function adobeIdBlankMessage(hideShow) {
    if (hideShow == "show") {
        $("#AdobeId-blank-error").show();
        if (!$("#AdobeId").hasClass("AccountFormInputError")) {
            $("#AdobeId").addClass("AccountFormInputError");
        }
    } else {
        $("#AdobeId-blank-error").hide();
    }
}
function alternateEmailError(hideShow) {
    if (hideShow == "show") {
        $("#AlternateEmail-error").show();
        if (!$("#AlternateEmail").hasClass("AccountFormInputError")) {
            $("#AlternateEmail").addClass("AccountFormInputError");
        }
    } else {
        $("#AlternateEmail-error").hide();
    }
}
function validateEmail(email) {
    var re = /^[a-zA-Z0-9\#\$\%\?\\\'\+\-\=\_\.]{1,}@((\[([0-9]{1,3}\.){3}[0-9]{1,3}\])|(([\w\-]+\.)+)([a-zA-Z]{2,4}))$/;
    return re.test(email);
}
function maskmyadobeidSection() {
    myadobeidSectionMask.hideContent();
}
function showmyadobeidSection() {
    myadobeidSectionMask.showContent();
}
function bindFocusOfPasswordTextFields() {
    $("#myadobeidForm input:text").focus(function (e) {
        inputId = $(e.target).attr("id");
        $(e.target).hide();
        $("#" + inputId + "Masked").show();
        $("#" + inputId + "Masked").focus();
        if (inputId == "CurrentPassword") {
            Adobe.Account.UserAccount.UserAccountController.disableSaveButton('myadobeidSection');
        }
        $("#myadobeidForm .IconGreenCheck").hide();
    });
}
function bindBlurOfPasswordFields() {
    $("#myadobeidForm input:password").blur(function (e) {
        $("#CurrentPasswordInfo span.AccountFormError").hide();
        inputId = $(e.target).attr("id").replace("Masked", "");
        if ($(e.target).val().length == 0) {
            $(e.target).hide();
            $("#" + inputId).show();
        } else {
            if ($("#NewPasswordMasked").val() && $("#NewPasswordMasked").val().length > 0 && $("#NewPasswordMasked").val().length < 6) {
                passwordLengthErrorTooFew = true;
                setAdobeIdFormError("NewPassword");
                hidePasswordsSameError();
            } else if ($("#NewPasswordMasked").val() && $("#NewPasswordMasked").val().length > 0 && $("#NewPasswordMasked").val().length > 100) {
                passwordLengthErrorTooMany = true;
                setAdobeIdFormError("NewPassword");
                hidePasswordsSameError();
            } else {
                clearAdobeIdFormError("NewPassword");
//Do not want to display both errors - so nested if
                if (newAndCurrentPasswordsDiffer()) {
                    hidePasswordsSameError();
                } else {
                    displayPasswordsSameError();
                }
            }
            if ($("#VerifyNewPasswordMasked").val().length > 0 && $("#NewPasswordMasked").val() != $("#VerifyNewPasswordMasked").val()) {
                setAdobeIdFormError("VerifyNewPassword");
            } else {
                clearAdobeIdFormError("VerifyNewPassword");
            }
        }
    });
}
function passwordFieldsReadyForSave() {
    var pwfieldsReady = true;
    var counter = 0;
    $.each($("#myadobeidForm input:password"), function (index, value) {
        if ($(value).val().length == 0) {
            pwfieldsReady = false;
            counter++;
        }
        if (counter === 3) {
            pwfieldsReady = true;
        }
    });
    return pwfieldsReady;
};
function savemypaymentinformationSection() {
    updatePaymentInformation();
}
function maskmypaymentinformationSection() {
    mypaymentinformationMask.hideContent();
}
function showmypaymentinformationSection() {
    mypaymentinformationMask.showContent();
}
function getPaymentInformation() {
    mypaymentinformationMask = $("#mypaymentinformationSection").view_mask({maskAlpha: .8}).controller();
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/payment_instruments" : "/include/jmvc/adobe/account/fixtures/my.info.jp.payment.instruments.json";
    $.ajax({
        type: 'GET',
        url: url,
        dataType: "json",
        contentType: "application/json",
        success: function (data) {
            if (!data) {
                hidePaymentSection();
                return;
            }
            var paymentInstrument = data["paymentInstrument.CreditCardPaymentInstrument"];
            fillPaymentInformationForm(paymentInstrument);
            if (paymentInstrument["paymentInstrument.creditCardShortNumber"]) {
                showDeleteCardLink();
            } else {
                hidePaymentSection();
            }
            accountController.fillDefaults("mypaymentinformationSection");
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.PaymentInstrument);
            xhr.setRequestHeader("Accept", "application/json");
        },
        error: function (data) {
            hidePaymentSection();
        },
        complete: function () {
            var accountController = Adobe.Account.UserAccount.UserAccountController;
            accountController.initialServiceCalls.payment = true;
            if (accountController.checkFullyLoaded()) {
                myInfoMask.showContent();
            }
        }
    });
}
function fillPaymentInformationForm(paymentJson) {
    $("#mypaymentinformationSection input").val("");
    if (paymentJson["paymentInstrument.creditCardShortNumber"]) {
        cardNumber = "************" + paymentJson["paymentInstrument.creditCardShortNumber"];
        $("#CardNumber1").val(cardNumber);
        $("#CardNumber1-default").val(cardNumber);
        $("#CardType-hidden").val(paymentJson["paymentInstrument.paymentType"]);
        if ($("#CardHolderName-default")) {
            if (paymentJson["paymentInstrument.account_holder_name"] && paymentJson["paymentInstrument.account_holder_name"] != "")
                $("#CardHolderName-default").val(paymentJson["paymentInstrument.account_holder_name"])
            else {
                $("#payment-InstrumentDetailsJP").hide();
            }
        }
        $("#mypaymentinformationSection img.ccLogo[rel='" + $("#CardType-hidden").val() + "']").parent().show();
        if (paymentJson["paymentInstrument.creditCardExpireDate"]) {
            month = parseCreditCardDate("month", paymentJson["paymentInstrument.creditCardExpireDate"]);
            year = parseCreditCardDate("year", paymentJson["paymentInstrument.creditCardExpireDate"]);
            $("#ExpirationDateMonth").val(month);
            $("#ExpirationDateYear").val(year);
            $("#ExpirationDateMonth-default").val(month);
            $("#ExpirationDateYear-default").val(year);
        }
        $("#mypaymentinformationSection").show();
    }
    OpenAjax.hub.publish('paymentDefaultsSet');
}
function cardNotOnFile() {
    $("#ExpirationDateMonth-span").parent("div").hide();
    $("label[for='ExpirationDateMonth']").parent("div").hide();
    $("label[for='CardNumber1']").parent("div").hide();
    $("#deletedPaymentInstrument").show().parents().show();
}
function hidePaymentSection() {
    accountController.hideSection("mypaymentinformationSection");
    accountController.fillDefaults("mypaymentinformationSection");
}
function updatePaymentInformation() {
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/payment_instruments" :
        "/include/jmvc/adobe/account/fixtures/my.info.update.payment.instruments.success.json"
    $.ajax({
        type: 'POST',
        url: url,
        data: paymentInformationXml(),
        contentType: "application/xml",
        success: function (data) {
            paymentInstrument = data["paymentInstrument.CreditCardPaymentInstrument"];
            fillPaymentInformationForm(paymentInstrument);
            $("#mypaymentinformationSection").find(".accountActionButtons").hide();
            showDeleteCardLink();
        },
        complete: function () {
            bindSave("mypaymentinformationSection");
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.PaymentInstrument);
        },
        dataType: "json"
    });
// Publish event to Omniture SiteCatalyst for metrics reporting
    OpenAjax.hub.publish("account.save_changes.payment_info");
}
function paymentInformationXml() {
    xmlToPost = "<CreditCardPaymentInstrument xmlns='http://www.adobe-services.com/2011-06-01/paymentInstrument'>" +
        "<creditCardExpireDate>" + $("#ExpirationDateYear").val() + "-" + $("#ExpirationDateMonth").val() + "-01</creditCardExpireDate>" +
        "<creditCardNumber>" + $("#CardNumber1").val() + "</creditCardNumber>" +
        "<creditCardTypeId>" + creditCardTypeFromNumber($("#CardNumber1").val()) + "</creditCardTypeId>" +
        "</CreditCardPaymentInstrument>";
    return xmlToPost;
}
function parseCreditCardDate(field, date) {
    if (field === "month") {
        dateParts = date.split("-");
        return dateParts[1];
    } else if (field === "year") {
        dateParts = date.split("-");
        return dateParts[0];
    }
}
function cancelmypaymentinformationSection() {
    clearDateErrors();
    $("#CardNumber1").removeClass("AccountFormInputError");
}
function validatemypaymentinformationSection() {
// if(validatemypaymentinformationSectionCardNumber1($("#CardNumber1")) && validatemypaymentinformationSectionDate()){
// return true;
// }
    return true;
}
function validatemypaymentinformationSectionDate() {
    var d = new Date();
    var thisMonth = d.getMonth() + 1;
    var thisYear = d.getFullYear();
    var dateIsValid = false;
//validating here is not necessary because CardNumber is required field and validation is run for those fields separately
//validatemypaymentinformationSectionCardNumber1($("#CardNumber1"));
    if (thisYear > $("#ExpirationDateYear").val()) {
        $("#ExpirationDateYear").addClass("AccountFormInputError");
        $("#ExpirationDateMonth").addClass("AccountFormInputError");
        $("#payment-ExpirationDateError").show();
    } else if (thisYear == $("#ExpirationDateYear").val() && thisMonth > $("#ExpirationDateMonth").val()) {
        $("#ExpirationDateYear").addClass("AccountFormInputError");
        $("#ExpirationDateMonth").addClass("AccountFormInputError");
        $("#payment-ExpirationDateError").show();
    } else {
        dateIsValid = true;
    }
    if (dateIsValid) {
        clearDateErrors();
    }
    return dateIsValid;
}
function validatemypaymentinformationSectionExpirationDateYear(el) {
    return validatemypaymentinformationSectionDate();
}
function validatemypaymentinformationSectionExpirationDateMonth(el) {
    return validatemypaymentinformationSectionDate();
}
function clearMoremypaymentinformationSectionExpirationDateMonth(el) {
    clearDateErrors();
}
function clearMoremypaymentinformationSectionExpirationDateYear(el) {
    clearDateErrors();
}
function validatemypaymentinformationSectionCardNumber1(el) {
    var cardIsValid = false;
    if (creditCardTypeFromNumber($("#CardNumber1").val()) === "UNKNOWN") {
        if (!$(el).hasClass("AccountFormInputError")) {
            $(el).addClass("AccountFormInputError");
        }
        $("#payment-CardNumber1Error").show();
    } else {
        cardIsValid = true;
        $(el).removeClass("AccountFormInputError");
        $("#payment-CardNumber1Error").hide();
    }
    return cardIsValid;
}
function clearDateErrors() {
    $("#ExpirationDateYear").removeClass("AccountFormInputError");
    $("#ExpirationDateMonth").removeClass("AccountFormInputError");
    $("#payment-ExpirationDateError").hide();
}
function deletePaymentInformation() {
// Publish event to Omniture SiteCatalyst for metrics reporting
    OpenAjax.hub.publish("account.save_changes.payment_info");
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/payment_instruments" :
        "/include/jmvc/adobe/account/fixtures/my.info.update.payment.instruments.delete.json"
    $.ajax({
        type: 'DELETE',
        url: url,
//data: paymentInformationXml(),
        contentType: "application/xml",
        success: function (data) {
            mypaymentinformationMask.showContent();
            processDeleteResponse(data);
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.DeletePaymentInstrument);
        },
        error: function (data) {
            if (data.status == 410) {
                mypaymentinformationMask.showContent();
                processDeleteResponse(data);
            } else {
                mypaymentinformationMask.showContent();
            }
        },
        dataType: "json"
    });
}
function processDeleteResponse(responseJson) {
    $("#deleteCard").hide().parent().hide();
    $("#mypaymentinformationSection").find(".accountActionButtons").hide();
    $("#CardNumber1").val("");
    $("#CardNumber1-default").val("");
    setExpireDate();
    cardNotOnFile();
    accountController.hideSectionWithEffect("mypaymentinformationSection", "blind");
}
function showDeleteCardLink() {
    $("#deleteCard").show().parent().show();
}
function setExpireDate() {
    var thisDate = new Date();
    var thisMonth = thisDate.getMonth();
    var thisYear = thisDate.getFullYear();
    thisMonth = (thisMonth <= 9 ? "0" + (thisMonth + 1) : thisMonth + 1);
    $("input#ExpirationDateMonth-default").val(thisMonth);
    $("input#ExpirationDateYear-default").val(thisYear);
}
/* use regular expressions to determine credit card type based on the number */
function creditCardTypeFromNumber(num) {
    if (num != $("#CardNumber1-default").val()) {
// first, sanitize the number by removing all non-digit characters.
//num = num.replace(/[^\d]/g,'');
        num = num.replace(/[-]/g, '');
        if (num.match(/\D/)) {
// now test the number against some regexes to figure out the card type.
        }
        else if (num.match(/^5[1-5]\d{14}$/)) {
            return 'MASTERCARD';
        }
        else if (num.match(/^4\d{15}/) || num.match(/^4\d{12}/)) {
            return 'VISA';
        }
        else if (num.match(/^3[47]\d{13}/)) {
            return 'AMEX';
        }
        else if (num.match(/^6011\d{12}/)) {
            return 'UNKNOWN';
//Discover not accepted.
//return 'DISCOVER';
        }
    }
    else {
        return "NO ENTRY";
    }
    return 'UNKNOWN';
}
function capitalizeCC(ccName) {
    var ccNames = ccName.toLowerCase().split(" ");
    if (ccNames.length > 1) {
        var stringToReturn = "";
        for (var x = 0; x < ccNames.length; x++) {
            ccNames[x] = capitaliseFirstLetter(ccNames[x]);
            stringToReturn = (stringToReturn.length > 0 ? stringToReturn + " " : "") + ccNames[x];
        }
        return stringToReturn;
    } else {
        return capitaliseFirstLetter(ccName.toLowerCase());
    }
}
$(document).ready(function () {
    $("#deleteCard").click(function (e) {
        e.preventDefault();
        Adobe.DialogComponent.JqDialogController.openDialog();
    });
});
OpenAjax.hub.subscribe('deletePaymentInstrument.confirmed', function (event, sso) {
    mypaymentinformationMask.hideContent();
    deletePaymentInformation();
});
OpenAjax.hub.subscribe('sso.ready', function (event, sso) {
    if ($(".payment").length > 0) {
        setExpireDate();
        getPaymentInformation();
    } else {
        accountController.initialServiceCalls.payment = true;
    }
});
OpenAjax.hub.subscribe('paymentDefaultsSet', function (event) {
    $.each($("#mypaymentinformationSection input:text, #mypaymentinformationSection select"), function (index, value) {
        var activeId = $(this).attr("id");
        if ($("#" + activeId + "-default:hidden").length > 0) {
            $("#" + activeId + "-span").text($("#" + activeId + "-default:hidden").val());
        }
    });
});
;
$.createNs("Adobe.Profile");
Adobe.Profile.Edu = {
    isEdu: false
}
var personalProfileFields = new Array("firstName", "lastName", "companyName", "jobFunction", "industry", "numberOfEmployees", "screenName");
var profileDropDownFields = new Array("jobFunction", "industry", "numberOfEmployees");
if (!Adobe.PageInfo) {
    Adobe.PageInfo = {};
}
if (Adobe.PageInfo.countryCode == "JP") {
    personalProfileFields.push("pronunciation_company_name", "pronunciation_first_name", "pronunciation_last_name")
}
$(document).ready(function () {
    getProfileOptions();
    getEdu();
});
function maskmypersonalprofileSection() {
    mypersonalprofilesectionMask = $("#mypersonalprofileSection").view_mask({maskAlpha: .8}).controller();
    mypersonalprofilesectionMask.hideContent();
}
function showmypersonalprofileSection() {
    mypersonalprofilesectionMask.showContent();
}
function getProfileData() {
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/user" :
        "/include/jmvc/adobe/account/fixtures/my.info.jp.user.json"
    $.ajax({
        type: 'GET',
        url: url,
        dataType: "json",
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            fillContactForm(data);
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.User);
        },
        error: function (data) {
        }
    });
}
function getProfileOptions() {
    var url = (Adobe.PageInfo.isJSP == undefined) ?
            "/svcs/references/account_data" :
            "/include/jmvc/adobe/account/fixtures/my.info.job.functions.json",
        locale = Adobe.PageInfo.AcceptLanguage;
    if (locale === "en_xeu") {
        locale = "en_gb"
    }
    $.ajax({
        type: 'GET',
        url: url,
        dataType: "json",
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            getProfileData();
            buildJobFunctionList(data);
            buildIndustryList(data);
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.AccountData);
            xhr.setRequestHeader("Accept-Language", locale);
        },
        error: function (data) {
            getProfileData();
        }
    });
}
function buildJobFunctionList(data) {
    var jobFunctions = data.accountData.job_functions,
        jobFunctionSelector = $("#jobFunction"),
        other = "";
    jobFunctions.sort(function (a, b) {
        var nameA = a.internal_code,
            nameB = b.internal_code;
        if (nameA < nameB) //sort string ascending
            return -1
        if (nameA > nameB)
            return 1
        return 0 //default return value (no sorting)
    })
    $.each(jobFunctions, function (index, value) {
        markup = '<option value="' + value.internal_code + '">' + value.job_function_name + '</option>';
        if (value.internal_code != "JOTHR") {
            jobFunctionSelector.append(markup)
        } else {
            other = markup;
        }
    });
    jobFunctionSelector.append(other)
}
function buildIndustryList(data) {
    var industries = data.accountData.industries,
        industriesSelector = $("#industry"),
        other = "";
    industries.sort(function (a, b) {
        var nameA = a.internal_code,
            nameB = b.internal_code;
        if (nameA < nameB) //sort string ascending
            return -1
        if (nameA > nameB)
            return 1
        return 0 //default return value (no sorting)
    })
    $.each(industries, function (index, value) {
        markup = '<option value="' + value.internal_code + '">' + value.industry_name + '</option>';
        if (value.internal_code != "IOTHR") {
            industriesSelector.append(markup)
        } else {
            other = markup;
        }
    });
    industriesSelector.append(other)
}
function getEdu() {
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/edu_info" :
        "/include/jmvc/adobe/account/fixtures/my.info.edu.info.review.json"
    $.ajax({
        type: 'GET',
        url: url,
        dataType: "json",
        contentType: 'application/json; charset=UTF-8',
        accept: 'application/json',
        success: function (data) {
            fillEdu(data);
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.Edu);
        },
        error: function () {
            Adobe.Profile.Edu.isEdu = false
            accountController.fillDefaults("mypersonalprofileSection");
        },
        complete: function () {
            var accountController = Adobe.Account.UserAccount.UserAccountController;
            accountController.initialServiceCalls.user = true;
            accountController.initialServiceCalls.edu = true;
            if (accountController.checkFullyLoaded()) {
                myInfoMask.showContent();
            }
        }
    });
}
function fillEdu(data) {
    mypersonalprofilesectionMask = $("#mypersonalprofileSection").view_mask({maskAlpha: .8}).controller();
    if (data && !!data["account.eDUInfo"]) {
        Adobe.Profile.Edu.isEdu = true;
        if (data["account.eDUInfo"]["account.eDUStatus"] == "APPROVED") {
            var eduLabel = Adobe.PageInfo.Labels[ data["account.eDUInfo"]["account.eDUUserType"]];
//IE Date standardization
            var eduExpireDate = getIEFriendlyDate(data["account.eDUInfo"]["account.expiry_date"]);
            var today = new Date();
            if (eduExpireDate > today) {
                $("#eduExpireDate").text(getFormattedDate(eduExpireDate));
                $("#eduTypeIndicator .AccountGreenButtonText").text(eduLabel).show().parents().show();
            }
        }
    }
    Adobe.Profile.Edu.isEdu = false;
}
function getIEFriendlyDate(date) {
    var d = date.replace(/-/g, '/').split('T')[0];
    return new Date(d);
}
function getFormattedDate(date) {
    var months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        month = months[date.getUTCMonth()],
        day = " " + date.getDate(),
        year = ", " + date.getUTCFullYear();
    return month + day + year;
}
function fillContactForm(contactJson) {
    if (contactJson) {
        var data = contactJson["account.user"];
        $("#mypersonalprofileSection input").val("");
        $.each(personalProfileFields, function (index, value) {
            if (value == "numberOfEmployees" || value == "jobFunction" || value == "industry" || value == "screenName") {
                var field = (data["account." + value] != "undefined" && data["account." + value] != undefined) ? decodeField(data["account." + value]) : "";
                thisValue = field;
                if (value == "screenName") {
                    Adobe.Profile.ScreenName = data["account.screenName"] || ""
                }
                if (value == "jobFunction") {
                    thisValue = data["account.job_function_code"] || "";
                }
                if (value == "industry") {
                    thisValue = data["account.industry_code"] || "";
                }
            } else {
                var contact = (data["account.contactInfo"]["contact." + value] != undefined && data["account.contactInfo"]["contact." + value] != "undefined") ? data["account.contactInfo"]["contact." + value] : "";
                thisValue = decodeField(contact);
            }
            value = (value == "screenName") ? "personalProfile-screenName" : value;
            if ($.inArray(value, profileDropDownFields) > -1) {
                $("#" + value + " [value='" + thisValue + "']").attr('selected', true);
            } else {
                $("#" + value).val(thisValue);
            }
            $("#" + value + "-default").val(thisValue);
            if (thisValue) {
                $("#" + value + "-default").addClass("user-entered");
            }
        });
    }
}
function savemypersonalprofileSection() {
// Publish event to Omniture SiteCatalyst for metrics reporting
    OpenAjax.hub.publish("account.save_changes.personal_profile");
    xmlToPost = getPersonalProfileXml();
    var url = (Adobe.PageInfo.isJSP == undefined) ?
        "/svcs/accounts/" + Adobe.Sso.SsoController.GUID() + "/user" :
        "/include/jmvc/adobe/account/fixtures/my.info.user.post.json"
    $.ajax({
        type: 'POST',
        url: url,
        data: xmlToPost,
        contentType: "application/xml; charset=UTF-8",
        success: function (data) {
            if ($("#personalProfile-screenName").val().length > 0) {
//$.cookie("SCREENNAME", $("#personalProfile-screenName").val());
                Adobe.Sso.SsoController.setUserName($("#personalProfile-screenName").val());
//Adobe.Sso.SsoController.setScreenName();
//$("#screenName").text($("#personalProfile-screenName").val());
            }
        },
        complete: function () {
            Adobe.Account.UserAccount.UserAccountController.sectionSaved("mypersonalprofileSection");
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("x-adobe-authorization", WCDServer);
            xhr.setRequestHeader("Authorization", Adobe.Tokens.User);
        },
        error: function (data) {
            var errorCode = data.getResponseHeader("x-adobe-status"),
                errorMsg = (Adobe.PageInfo.Labels[errorCode] != undefined) ? Adobe.PageInfo.Labels[errorCode] : Adobe.PageInfo.Labels["MEM_SCREEN_NAME_DEL_ERR"];
            if (errorCode == "1401f" || data.status == "500") {
                return;
            }
            $("#personalProfile-screenName").addClass("AccountFormInputError");
            $("#personalProfile-screenName-error").html(errorMsg).show();
            $("#personalProfile-screenName").keyup(function (e) {
                $("#personalProfile-screenName").removeClass("AccountFormInputError")
                $("#peronalProfile-screenName-default").next().hide();
            })
            $("#personalProfile-screenName").keyup(function (e) {
                $("#personalProfile-screenName-error").hide();
            })
        },
        dataType: "json"
    });
}
function cancelmypersonalprofileSection() {
//this function called by pattern by myinformation.js
}
function validatemypersonalprofileSection() {
//this function called by pattern by myinformation.js
    return true;
}
function getPersonalProfileXml() {
    xmlToPost = getXmlBody();
    return xmlToPost;
}
function getXmlBody() {
    var xmlBody = "",
        fields = {};
    $.each(personalProfileFields, function (index, value) {
        value = (value == "screenName") ? "personalProfile-screenName" : value;
        var field = $("#" + value).val();
        fields[value] = encodeField(field);
    })
    xmlBody += '<ns11:user xmlns:ns8="http://www.adobe-services.com/2011-06-01/contact" xmlns:ns11="http://www.adobe-services.com/2011-06-01/account">';
    xmlBody += '<ns11:contactInfo>';
    if (Adobe.PageInfo.countryCode == "JP") {
        xmlBody += '<ns8:pronunciation_first_name>' + fields['pronunciation_first_name'] + '</ns8:pronunciation_first_name>' +
            '<ns8:pronunciation_last_name>' + fields['pronunciation_last_name'] + '</ns8:pronunciation_last_name>' +
            '<ns8:pronunciation_company_name>' + fields['pronunciation_company_name'] + '</ns8:pronunciation_company_name>';
    }
    xmlBody += '<ns8:firstName>' + fields['firstName'] + '</ns8:firstName>' +
        '<ns8:lastName>' + fields['lastName'] + '</ns8:lastName>' +
        '<ns8:companyName>' + fields['companyName'] + '</ns8:companyName>' +
        '</ns11:contactInfo >';
    if ($("#numberOfEmployees"))
        xmlBody += '<ns11:numberOfEmployees>' + fields['numberOfEmployees'] + '</ns11:numberOfEmployees>';
    if ($("#jobFunction"))
        xmlBody += '<ns11:job_function_code>' + fields['jobFunction'] + '</ns11:job_function_code>';
    if ($("#industry"))
        xmlBody += '<ns11:industry_code>' + fields['industry'] + '</ns11:industry_code>';
    xmlBody += '<ns11:screenName>' + fields['personalProfile-screenName'] + '</ns11:screenName>' +
        '</ns11:user>';
    return xmlBody;
};
(function () {
    $.Class.extend("Adobe.Net.JaxbModelUtil",
        {
            extractArrayOfTypesFromNode: function (rawDataArray, theClass, stripNameSpaces) {
                rawDataArray = rawDataArray || [];
                var len = rawDataArray.length,
                    strip = stripNameSpaces || false;
                array = [];
                for (var i = 0; i < len; i++) {
                    var data = strip ? this.createObjectWithSimpleNames(rawDataArray[i]) : rawDataArray[i];
                    array.push(new theClass(data));
                }
                return array;
            },
            createObjectWithSimpleNames: function (obj) {
                var newObj = {};
                if ($.isPrimitive(obj))
                    return obj;
                for (var oldName in obj) {
                    var name = oldName;
                    if (oldName.indexOf('.') != -1) {
                        name = oldName.split(".")[1];
                    } else if (oldName.indexOf('@') != -1) {
                        name = oldName.substr(1);
                    }
                    if ($.isPlainObject(obj[oldName])) {
                        newObj[ name ] = this.createObjectWithSimpleNames(obj[oldName]);
                    } else if ($.isArray(obj[oldName])) {
                        newObj[name] = [];
                        for (var i = 0; i < obj[oldName].length; i++) {
                            newObj[name][i] = this.createObjectWithSimpleNames(obj[oldName][i]);
                        }
                    } else {
                        newObj[ name ] = obj[ oldName ];
                    }
                }
                return newObj;
            },
            insertValuesIntoModelNode: function (values, node) {
                for (var name in values) {
                    var fullName = this.getPropertyFullNameFromSimpleName(node, name);
                    if (fullName) {
                        if ($.isPlainObject(values[name]) && $.isPlainObject(node[ fullName ]))
                            this.insertValuesIntoModelNode(values[ name ], node[ fullName ]);
                        else if (!$.isPlainObject(values[name]) && !$.isPlainObject(node[ fullName ]))
                            node [fullName ] = values[ name ];
                    }
                }
            },
            getPropertyFullNameFromSimpleName: function (node, simpleName) {
                for (var prop in node) {
                    if (( prop.indexOf('.') != -1 && prop.split('.')[1] === simpleName ) ||
                        ( prop.indexOf('@') != -1 && prop.substr(1) === simpleName )) {
                        return prop;
                    }
                }
                return false;
            }
        },
        {
        });
})(jQuery);
