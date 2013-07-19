/**
 * Created with JetBrains PhpStorm.
 * User: rnikunen
 * Date: 6/26/13
 * Time: 5:43 PM
 */

jQuery(function(j){
    var jobsArray = [],
        searchArray = [],
        types = [],
        loc = [],
        companyArray = [],
        userfilters = [],
        curPage = 1,

        cmp = function(x, y){ // generic comparison function
            return x > y ? 1 : x < y ? -1 : 0;
        },

    /*sort by */
        timeStampSortDesc = function(a,b){
            return -cmp(new Date(a['admin_approval']),new Date(b['admin_approval']));
        },

        expireDateSortDesc = function(a,b){
            return (b['expire_date'] < a['expire_date']) ? -1 : 1;
        },

        salarySortDesc = function(a,b){
            var salaryType1 = parseInt( a['salary_type'] ),
                salaryType2 = parseInt( b['salary_type'] ),
                salary1 = 0,
                salary2 = 0;
            if (a['salary_type']==1) {
                salary1 = a['salary_min'];
            } else if ( salaryType1==2) {
                salary1=(a['salary_min'] + a['salary_max'] )/2
            }

            if ( salaryType2==1 ){
                salary2 = b['salary_min'];
            } else if ( salaryType2==2 ) {
                salary2=( b['salary_min'] + b['salary_max'] )/2
            }

            return (salary2 < salary1) ? -1 : 1;
        },

        locationSort = function(a,b){
            return [cmp(a['location_city'].toLowerCase(), b['location_city'].toLowerCase()), -cmp(new Date(a['admin_approval']), new Date(b['admin_approval']))] < [cmp(b['location_city'].toLowerCase(), a['location_city'].toLowerCase()), -cmp(new Date(b['admin_approval']), new Date(a['admin_approval']))] ? -1:1;
        },

        jobCategorySort = function(a,b){
            return [cmp(a['job_category'].toLowerCase(), b['job_category'].toLowerCase()), -cmp(new Date(a['admin_approval']), new Date(b['admin_approval']))] < [cmp(b['job_category'].toLowerCase(), a['job_category'].toLowerCase()), -cmp(new Date(b['admin_approval']), new Date(a['admin_approval']))] ? -1:1;
        },

        companyNameSort = function(a,b){
            return [cmp(a['company_name'].toLowerCase(), b['company_name'].toLowerCase()), -cmp(new Date(a['admin_approval']), new Date(b['admin_approval']))] < [cmp(b['company_name'].toLowerCase(), a['company_name'].toLowerCase()), -cmp(new Date(b['admin_approval']), new Date(a['admin_approval']))] ? -1:1;
        },

        sortArray = function(){
            switch ( parseInt(j('#sort-by').val()) )
            {
                case 1: searchArray.sort(jobCategorySort);
                    break;
                case 2: searchArray.sort(locationSort);
                    break;
                case 3: searchArray.sort(salarySortDesc);
                    break;
                case 4: searchArray.sort(timeStampSortDesc);
                    break;
                case 5: searchArray.sort(expireDateSortDesc);
                    break;
                case 6: searchArray.sort(companyNameSort);
                    break;
                default: searchArray.sort(timeStampSortDesc);
            }
        },

        filterResults = function() {
            var searchText = j("#company-search").val(),
                salaryMin = j("#salary_min").val(),
                salaryMax = j("#salary_max").val(),
                postRange = j("#posting_range").val(),
                expireRange = j("#expiration_range").val(),
                workExpMin = j("#workExpMin").val(),
                workExpMax = j("#workExpMax").val(),
                curPage = 1,
                searchArray = jobsArray;

            j('.remove-me').remove();
            // Filter by company name search.
            if (searchText.length > 0)	{
                searchArray = jQuery.grep(
                    searchArray,
                    function (a) {
                        return	(a['company_name'].toLowerCase().indexOf(searchText.toLowerCase()) == 0) ? true : false;
                    });
            }

            // Filter by company name list.
            if (companyArray.length > 0 && searchText.length==0)	{
                searchArray = jQuery.grep(
                    searchArray,
                    function (a) {
                        return (j.inArray(a['company_name'].toLowerCase(),companyArray) > -1) ? true : false;
                    });
            }

            // Filter by company types that have been selected.
            if (types.length > 0)	{
                searchArray = jQuery.grep(
                    searchArray,
                    function (a) {
                        return (j.inArray(a['category_id'],types) > -1) ? true : false;
                    });
            }

            // Filter by locations that have been selected.
            if (loc.length>0)
            {
                searchArray = jQuery.grep(
                    searchArray,
                    function (a) {
                        return (j.inArray(a['location_ids'],loc) > -1) ? true : false;
                    });
            }

            // Filter by salary that have been selected.
            if (salaryMin > 0 || salaryMax > 0)
            {
                if (salaryMax==0) {salaryMax=9999}
                searchArray = jQuery.grep(
                    searchArray,
                    function (a) {
                        b = a['salary_min'];
                        c = a['salary_max'];
                        if ( (b >= salaryMin && b <= salaryMax )
                            || ( c >= salaryMin 	&& c <= salaryMax )
                            || (salaryMin >= b	&& salaryMax <= c)
                            ){ return true}

                    });
            }

            // Filter by work Exp that have been selected.
            if (workExpMin > -1 || workExpMax > 0)
            {
                if (workExpMax==-1) { workExpMax=99}
                searchArray = jQuery.grep(
                    searchArray,
                    function (a) {
                        b = a['min_workexp'];
                        c = a['max_workexp'];
                        if ( (b >= workExpMin && b <= workExpMax )
                            || ( c >= workExpMin 	&& c <= workExpMax )
                            || (workExpMin >= b	&& workExpMax <= c)
                            ){ return true}

                    });
            }

            // Filter by posting Date that have been selected.
            if (postRange != '') {
                var currDate  = new Date().getTime();
                var postStop  = new Date();
                var oneDay = 1000*60*60*24;
                postRange = postRange * oneDay;
                var postStop = new Date(postStop.getFullYear(),postStop.getMonth(),postStop.getDate())
                var postStart =  new Date(postStop - postRange);
                searchArray = jQuery.grep(
                    searchArray,
                    function (a) {
                        var postDate = new Date(a['posting_date']);
                        if ( postDate >= postStart && postDate <= postStop ){ return true}
                    });
            }

            // Filter by Expiration Date that have been selected.
            if (expireRange != '')
            {
                var currDate  = new Date().getTime();
                var expireStart  = new Date();
                var oneDay = 1000*60*60*24;
                expireRange = expireRange * oneDay;
                var expireStart = new Date(expireStart.getFullYear(),expireStart.getMonth(),expireStart.getDate());
                var expireStop = new Date(currDate + expireRange);
                searchArray = jQuery.grep(
                    searchArray,
                    function (a) {
                        var expireDate = new Date(a['expire_date']);
                        if ( expireDate >= expireStart && expireDate <= expireStop ){ return true}
                    });
            }

            // Filter by type filters that have been selected.
            if (userfilters.length>0) {
                searchArray = jQuery.grep(
                    searchArray, function (a) {
                        var jobfilters = $.parseJSON( '[' + a['filters'] + ']');
                        var r = false;
                        j(jobfilters).each(function(i,v)
                        {	//loop through array of options for Job
                            retrun ( j.inArray(v,userfilters)>-1 ) ? true : false;
                            if(f>-1){ r = true;	return false;}//break out off each loop
                        });
                        return r;
                    });
            }

            sortArray();
            loadFeaturedPostings(types);
            loadMore(15);
        },

        trimString = function(textVal,maxChar) {
            if (textVal.length > maxChar) {
                return textVal.substring(0, maxChar).split(" ").slice(0, -1).join(" ") + "...";
            } else {
                return textVal;
            }
        },

        getCompanyLogo = function(companyLogo){
            if(companyLogo=='') {companyLogo="no-logo.jpg"; }
            return '<img src="/jobimages/' + companyLogo + '" border="0" width="150" height="120">';
        },

        getJobLink = function(jobId,linkText){
            return "<a href='view_job.php?id=" + jobId + "' target='_blank'>"+linkText+"</a>";
        },

        getJobHref = function(jobId){
            return "view_job.php?id=" + jobId;
        },

        getSalaryText = function(salaryType,salaryMin,salaryMax,salaryText){
            function getSalaryFormat(value) {return (value > 999) ? "$"+(value/1000)+"M" : "$"+value+"K";}

            if (salaryType==1) {return 'Salary: ' + getSalaryFormat(salaryMin);}
            if (salaryType==2) {return 'Salary Range: ' + getSalaryFormat(salaryMin) + '-' + getSalaryFormat(salaryMax);}
            if (salaryType==3) {return 'Salary: ' + salaryText;}
            if (salaryType==4) {return 'Salary: Not specified';}
        },

        getWorkExpText = function(minWorkExp,maxWorkExp){
            var minWorkExpText = minWorkExp,
                maxWorkExpText;
            if(minWorkExp=='99' || minWorkExp=='15') {
                (minWorkExp=='99') ? minWorkExpText = '&gt; 15 years' : minWorkExpText = '15 years';
            } else {
                (maxWorkExp=='99') ? maxWorkExpText = '&gt; 15 years' : maxWorkExpText = maxWorkExp + ' years';
            }
            return minWorkExpText + ' to ' + maxWorkExpText;
        },

        loadMore = function(recPerPage) {
            if (searchArray.length > 0) {
                var startRec = (curPage - 1) * 15;
                if (recPerPage!=-1) {
                    endRec = Math.min(startRec + recPerPage, searchArray.length);
                } else {
                    endRec = searchArray.length;
                }
                recordsToShow = searchArray.slice(startRec, endRec),
                    appendRecords(recordsToShow,startRec,endRec);

                if ($('#zero-results').is(':visible')) {
                    j('.j-counter').show();
                    j('#zero-results').hide();
                }
                var counterText = 'Showing Results 1 to ' + endRec + ' of ' + searchArray.length;
                j(".record-counter").html(counterText);
                if (endRec==searchArray.length) {
                    j("#bottom-counter").hide();
                } else {
                    curPage++;
                    j("#bottom-counter").show();
                }
            } else {
                j('.j-counter').hide();
                j('#zero-results').show();
            }

        },

        appendRecords = function(recordsToShow,startRec) {
            $.each(recordsToShow, function (index, array) {
                var curJob = (startRec + 1) + index;
                cloneDiv(curJob);
                populateJob(curJob, array);
            });

        },

        populateJob = function(B,C) {
            //populate results(name,i,a)
            var node = "#job-row" + B,
                featured = C['featured'],
                companyLogo = C['company_logo'],
                companyName = trimString(C['company_name'],38),
                jobTitle = trimString(C['job_title'],42),
                postingDate = C['posting_date'],
                expireDate = C['expire_date'],
                jobId = C['job_id'],
                salaryType = parseInt(C['salary_type']),
                salaryMin = C['salary_min'],
                salaryMax = C['salary_max'],
                salaryText = C['salary_text'],
                jobCategory = trimString(C['job_category'],20),
                locationCity = trimString(C['location_city'],20),
                minWorkExp = C['min_workexp'],
                maxWorkExp = C['max_workexp'];

            if (featured==1 || featured==3) {
                $(node + " .embelish").addClass('highlight');
            }
            if ( B % 1 != 0 ) {
                $(node + " .embelish").addClass('featured');
                $(node + " .featured-button").show();
            }
            $(node + " .featured-button").attr('id',jobId);
            $(node + " .featured-button").attr('href',getJobHref(jobId));
            $(node + " .j-company").html(getJobLink(jobId,companyName));
            $(node + " .j-ctype").html(jobCategory);
            $(node + " .j-logo").html(getJobLink(jobId,getCompanyLogo(companyLogo)));
            $(node + " .j-title").html(getJobLink(jobId,jobTitle));
            $(node + " .j-location").html(locationCity);
            $(node + " .j-salary").html(trimString(getSalaryText(salaryType,salaryMin,salaryMax,salaryText),27));
            $(node + " .j-postdate").html(postingDate);
            $(node + " .j-work-exp").html(trimString(getWorkExpText(minWorkExp,maxWorkExp),15));
            $(node).show();
        },

        cloneDiv = function(curJob) {
            var cloned = j("#job-row").clone(true, true).addClass('remove-me').get(0);
            cloned.id = "job-row" + curJob;
            j(cloned).appendTo("#job-results");
        },

        cloneFeaturedDiv = function(curJob) {
            var cloned = j("#job-row").clone(true, true).addClass('remove-me').get(0);
            cloned.id = "job-row" + curJob;
            j(cloned).appendTo("#featured-jobs");
        },

        loadJobPostings = function() {
            //load all jobs
            j.ajax({
                url: 'get_job_list.php',
                type: 'post',
                data : {req: 'getAllJobs'},
                dataType: "json",
                success: function (json,status) {
                    jobsArray = json;
                    filterResults();
                },
                error: function(x,y,z) {
                    console.log(y);
                    console.log(z);
                }
            });
            return false;
        },

        displayFeatured = function(featuredArray) {
            j.each(featuredArray, function (index,array) {
                var curJob = "featured"+index;
                cloneFeaturedDiv(curJob);
                populateJob(curJob, array)
            });
        },

        loadFeaturedPostings = function(jobTypes) {
            //load all jobs
            j.ajax({
                url: 'get_job_list.php',
                type: 'post',
                data : {req: 'getFeaturedList', cat: jobTypes},
                dataType: "json",
                success: function (json,status) {
                    if (!json.msg) {
                        displayFeatured(json);
                    }
                    //filterResults();
                },
                error: function(x,y,z) {
                    console.log(y);
                    console.log(z);
                }
            });
            return false;
        },

        i = function() {
            j("input").each ( function(){
                console.log(j(this).id + " " + j(this).val());
            });
        },

        h = function(D) {
            Z = new Date();
            Z.setDate(Z.getDate()+D);
            return Z;
        },

        populateCompanyList = function (jsonArray) {
            var listCounter = 0,
                listGroup= 0,
                listBreakCounter = 0,
                C='<div class="section">';
            j.each(jsonArray, function (index,value) {
                C += '<div class="comp';
                if (listCounter>15) {
                    C += ' comp-hide';
                }
                C += ' comp-group' + listGroup + '"><input class="company-checkbox" type="checkbox" value="' + value.company_name + '"><span class="company-name">' + trimString(value.company_name,25) + '</span></div>';
                if (listBreakCounter==15) {

                    C += '<div class="comp comp-more comp-group' + listGroup;
                    listGroup++;
                    if (listGroup>1) {
                        C += ' comp-hide';
                    }
                    C += '" id="comp-group' + listGroup + '"><span class="comp-icon close"></span><span class="company-more">Show More...</span></div>';

                    listBreakCounter=0;
                }
                listCounter++;
                listBreakCounter++;
            })
            C += "</div>";
            j("#company-filter").append(C);

            j(".company-checkbox").click(function() {
                var companyName = j(this).val();
                if (j(this).is(':checked')) {
                    companyArray.push(companyName.toLowerCase());
                }  else {
                    companyArray = j.grep(companyArray, function(value){ return value != companyName.toLowerCase()});
                }
                filterResults();
            });

            j(".comp-more").click(function() {
                var curId = j(this).attr("id");
                j(this).slideToggle("slow");
                j('.'+curId).slideToggle("slow");
            });
        },

        loadCompanyList = function() {
            //load all jobs
            j.ajax({
                url: 'get_job_list.php',
                type: 'post',
                data : {req: 'getCompanyList'},
                dataType: "json",
                success: function (json,status) {
                    populateCompanyList(json);
                    return true;
                },
                error: function(x,y,z) {
                    console.log(y);
                    console.log(z);
                }
            });
            return false;
        },

        populateLocationList = function (D) {
            var I ="<div class='loc-section'>";
            j.each(D, function (A, B) {
                I += "<div class='loc'>";
                I += "<input class='loc-parent' type='checkbox' value=" + B.id + ">";
                I += "<span class='loc-icon close'></span><span class='loc loc-title'>" + B.name + "</span><br class='loc-spacer'>";
                //I += "</div>";
                I += "<div class='item-toggle' style='display:none;'>";
                j.each(B.sub_locations, function (C, D) {

                    I += "<div class='loc'>&nbsp;<input class='loc-sub " + B.id + "' type='checkbox' value=" + D.id + ">";
                    I += "<span class='loc loc-text'>" + D.name + "</span></div>";

                })
                I += "</div></div>";
            })
            I += "</div>";
            j("#location-filter").append(I);

            j(".loc-parent").click(function() {
                var regionId = j(this).val();
                if (j(this).is(':checked')) {
                    j(".loc-sub." + regionId).each(function () {
                        var subId = parseInt(j(this).val());
                        j(this).prop('checked', false);
                        loc.push(subId);
                    });
                } else {
                    j(".loc-sub." + regionId).each(function () {
                        var subId = parseInt(j(this).val());
                        loc = j.grep(loc, function(value){ return value != subId});
                    });
                }
                filterResults();
            });

            j(".loc-sub").click(function() {
                var classes = j(this).attr("class").split(" "),
                    parentClass = classes[classes.length-1],
                    subId = parseInt(j(this).val());
                if (j(this).is(':checked')) {
                    j('input.loc-parent[value=' + parentClass + ']').prop('checked', false);

                    j(".loc-sub." + parentClass).each(function () {
                        var newSubId = parseInt(j(this).val());
                        if (!j(this).is(':checked')) {
                            loc = j.grep(loc, function(value){ return value != newSubId});
                        }
                    });
                    loc.push(subId);
                } else {
                    loc = j.grep(loc, function(value){ return value != subId});
                }
                filterResults();
            });
            j(".loc-title").click(function() {
                j(this).siblings('.loc-icon').toggleClass("open close");
                j(this).siblings('.loc-spacer').toggleClass("open close");
                j(this).siblings('.item-toggle').slideToggle("slow");
            })

            j(".loc-icon").click(function() {
                j(this).toggleClass("open close");
                j(this).siblings('.loc-spacer').toggleClass("open close");
                j(this).siblings('.item-toggle').slideToggle("slow");
            })

        },

        customBindEvents = function() {
            //Event Bindings

            j(".item-parent").click(function() {
                var a = j(this).attr('name');
                if (j(this).is(':checked')) {
                    j("." + a + " input:checkbox").each(function () {
                        j(this).attr('checked', false);
                    });
                }
            });

            j(".item-sub").click(function() {
                var a = j(this).attr('parent-id'),
                    b = parseInt(j(this).val());
                if (j(this).is(':checked')) {
                    j("input#" + a).attr('checked', false);
                    userfilters.push(b);
                } else {
                    userfilters = j.grep(userfilters, function(value){ return value != b});
                }
                filterResults();
            });

            //select company type
            j(".category-select").click(function() {
                var a = parseInt(j(this).val());
                if (j(this).is(':checked')) {
                    types.push(a);
                }  else {
                    types = j.grep(types, function(value){ return value != a});
                }
                filterResults();
                /*j(".filter-" + a).each(function (I) {
                 if (I==0) {
                 j(this).toggle();
                 j(this).children().removeClass("close");
                 } else {
                 j(this).hide();
                 j(this).find("input").each(function(){
                 j(this).attr('checked', false);
                 });
                 }
                 });		*/

            });
        },

        populateJobType = function (company_type) {
            j.each(company_type, function (A, B) {
                //Company Type Category list
                var I = "<div class='filter-title cat-label filter-" + B.id + "' style='display:none'>" + B.name + " Filters</div>";
                I += "<div class='cat-wrap filter-" + B.id + "' style='display:none'>";
                //Company Type
                var J = "<div class='item'><input class='category-select' type='checkbox' value=" + B.id + ">";
                J += "<span class='cat-text'>" + B.name + "</span></div>";
                j.each(B.category, function (C, D) {
                    I += "<div class='filter-label'>" + D.name + "</div>";
                    I += "<li class='section'><div class='section-block'>";
                    j.each(D.filter, function (E, F) {
                        if (D.type != 'title') {
                            I += "<div class='item'>";
                            I += "<input class='item-sub' type='checkbox' value=" + F.id + ">";
                            I += "<span class='item-text'>" + F.name + "</span>";
                            I += "</div>";
                        } else {
                            I += "<div class='item'>";
                            I += "<input class='item-parent' type='checkbox' value=" + F.id + ">";
                            I += "<span class='item-title'>" + F.name + "</span>";
                            I += "</div>";
                            j.each(F.sub_filter, function (G, H) {
                                I += "<div class='item'>";
                                I += "<input class='item-sub'" + F.id + "' type='checkbox' value=" + H.id + ">";
                                I += "<span class='item-text'>" + H.name + "</span>";
                                I += "</div>";
                            });
                        }
                    });
                    /*I += "</div></li><div class='expand-toggle'>more...</div>";*/
                    I += "</div></li>";
                })
                j("#company-types").append(J);
                j("#filters-list").append(I);
            })

            customBindEvents();
        },

        loadRegionData = function() {
            /*get regions*/
            j.ajax({
                url: 'regions.php',
                dataType: "json",
                success: function (A,B) {
                    //console.log("status: " + status);
                    populateLocationList(A.locations);
                    return true;
                },
                error: function(x,y,z) {
                    console.log(y);
                    console.log(z);
                }
            });
        },

        loadFilterData = function() {
            j.ajax({
                url: 'filter.php',
                dataType: "json",
                async: false,
                success: function (C,D) {
                    populateJobType(C.company_type);
                    return true;
                },
                error: function(x,y,z) {
                    console.log(y);
                    console.log(z);
                }
            });
        };

    j(document).ready(function() {
        loadRegionData();
        loadFilterData();
        loadCompanyList();
        loadJobPostings();

        j("#load-more").click(function() {
            loadMore(15);
        })

        j("#load-all").click(function() {
            loadMore(-1);
        })

        j("#company-search").keyup(function(e) {
            filterResults();
        });

        j(".filters").change(function(e) {
            filterResults();
        });

        j(".cat-label").click(function() {
            j(this).children().toggleClass("close","open");
            j(this).next("div").slideToggle("slow");
        });
    });

});
