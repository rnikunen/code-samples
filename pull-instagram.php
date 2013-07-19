<?php
/**
 * Created by JetBrains PhpStorm.
 * User: rnikunen
 * Date: 4/24/13
 * Time: 2:06 PM
 */

/* Pull Instagram feeds by tags with option of limiting results to single user
* @param tags array - the target input field or division or span
* @param user text (optional) - the Instagram ID or Username of the user
 *
 */
function get_instagram($tags,$user=''){
    $user_id = $user;
    $access_token = "ENTER_YOUR_TOKEN_HERE";
    $count =  "50";
    $images = array();
    $min_id = null;
    $counter = 0;

    if ($user == '') {
        $next_url = 'https://api.instagram.com/v1/tags/'.$tags[0].'/media/recent/?access_token='.$access_token.'&count='.$count;
    } else {
        $next_url = 'https://api.instagram.com/v1/users/'.$user_id.'/media/recent/?access_token='.$access_token.'&count='.$count;
    }

    while ($next_url) {
        $counter++;
        $jsonData = json_decode(file_get_contents($next_url), true);
        $images = array_merge($images, $jsonData['data']);

       //loop through a max of 10 pages of data only.
       if ($jsonData['pagination']['next_url'] && $counter < 10) {
           $next_url = $jsonData['pagination']['next_url'];
        } else {
            $next_url = false;
        }
    }

    //Lets strip out the data we dont need.
    images_clean($images,$tags);

}

function images_clean($images,$tag_list) {
    foreach($tag_list as $tag) {
        $$tag = array();
    }
    foreach($images as &$i) {
        //strip out the garbage we don't need
        foreach (explode(' ', 'type caption comments likes user_has_liked') as $key) {
            unset($i[$key]);
        }

        //Populate arrays by tags
        foreach( $i['tags'] as $tag) {
            if (in_array($tag, $tag_list)) {
               array_push($$tag, $i);
            }
        }

    }

    //Write out to Json File one for each tag.
    foreach($tag_list as $tag) {
        //only write out if populated to prevent wiping out live json files
        if (count($$tag) > 0) {
            write_to_json($tag,$$tag);
        }
        echo $tag . " : ".count($$tag) . '<br>';
    }
    echo 'Done<br>';
}

function write_to_json($tag,$data) {
    $fp = fopen(dirname(__FILE__).'/json/'.$tag.'.json', 'w');
    $data = array_reverse($data);
    fwrite($fp, json_encode($data));
    fclose($fp);
}

/* Pull Instagram feeds by tags with option of limiting results to single user
* @param tags array - the target input field or division or span
* @param user text (optional) - the Instagram ID or Username of the user
*/

//Replace the array values below to pull contest pics submitted via th
get_instagram(array("ipromycity"));

//Below pull feed for iprolens user ONLY, filtered by the list of tags
get_instagram(array("iprolens","macro","fisheye","wideangle","superwide","2xtele"),"11783928");
