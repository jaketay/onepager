const _ = require('underscore');
require("./_mixins");
const $               = jQuery; //jshint ignore: line

let getLiveModeHTML = function(livemode, content){
  let $section = $("<div />", {html: content});
  
  
  _.each(livemode, function(classNames, selector){
    _.each(classNames, function(className){
      $section.find(selector).removeClass(className);
    });
  });

  return $section.html();
};

function unifySection(section, duplicate=false){

  // make a section refs and ids unique so we can duplicate
  section     = _.copy(section);

  if(!section.id){
    section.title = "untitlted section";
  } else if(duplicate) {
    section.title = `${section.title} (copy)`;
  }
    
  //TODO: bad pattern
  // console.log("changing id");
  if(duplicate || !section.id){
    section.id  = _.randomId("s_"); //do we need id?
  }

  section.key  = _.randomId("k_"); //do we need key? //yes we need //need better organization

  //bug because repeater is getting itself turned into null
  var reffer = function(fields){
    fields.forEach(field=>{
      // if(!field) return; //if its null? why should field be
      field.ref = _.uniqueId("ref_");

      if(!field.fields) {
        return;
      }

      field.fields.forEach(child=>{
          child.forEach( gchild => gchild.ref = _.uniqueId("ref_"));
      });
    });
  };

  reffer(section.contents);
  reffer(section.settings);
  reffer(section.styles);

  return section;
}


let mistify = function(databaseFields, sectionFields){
  let getInput = function(field){
    if(databaseFields){
      field.value = databaseFields[field.name];
    }
    
    return field;
  };

  let getRepeaterGroups = function(bGroups, dbGroups){

    return _.map(bGroups, function(rGroup, groupIndex){
      return _.map(rGroup, function(rField){
        let field   = _.copy(rField);
        field.value = dbGroups[groupIndex][rField.name];
        return field;
      });
    });
  };

  let getRepeaterField = function(field){
    let totalGroups = databaseFields[field.name].length; //what if its not an array?

    //we have only one repeatgroup so lets increse it by how much we need
    _.times(totalGroups-1, function(){ 
      field.fields.push(field.fields[0]); //what if field.fields does not exist?
    });
    

    field.fields = getRepeaterGroups(field.fields, databaseFields[field.name]);

    return field;
  };


  /*
  So how does this happen?
  1. take a section field
  */
  return _.map(sectionFields, function(sectionField){
    //is it a field or repeatable?
    return sectionField.type === "repeater" ? getRepeaterField(sectionField) : getInput(sectionField);
  });
};

let misitifySections = function(sections, blocks){
	return _.map(sections, function(section){
    let block = _.find(blocks, {slug: section.slug}); 
    
    //what if a block disappears
    if(!block) {
			return false;
		}
		
    block           = _.copy(block);
    block.id        = section.id;
    block.content   = getLiveModeHTML(block.livemode, section.content);
    block.title     = section.title;
    block.style     = section.style;
    block.contents  = mistify(section.contents, block.contents);
    block.settings  = mistify(section.settings, block.settings);
		block.styles    = mistify(section.styles, block.styles);


		// console.log(block);
		return unifySection(block);
	}).filter(Boolean);
};


let simplify = function(fields){
  return _.reduce(fields, function(collection, field){
    if(field.type === "repeater"){

      //instatiate an empty array 
      collection[field.name] = [];

      _.forEach(field.fields, function(rgroup, gi){

          //instatiate an empty object for repeat group
          collection[field.name][gi] = {};


          _.forEach(rgroup, function(control){
            //insert input into the repeat group obj
            collection[field.name][gi][control.name] = control.value;
          });

      });
    } else {
      //insert input into the fields
      collection[field.name] = field.value;
    }

    //return simplified obj
    return collection;
  }, {});
};

function simplifySections(sections){
  let oSections = _.copy(sections);

  return _.map(oSections, function(section){
    let data      = {
        id       : section.id,
        slug     : section.slug,
        title    : section.title,
        contents : simplify(section.contents),
        settings : simplify(section.settings),
        styles   : simplify(section.styles),
    };

    return data;
  });
}



module.exports = {
	simplifySections,
	misitifySections,
	unifySection
};