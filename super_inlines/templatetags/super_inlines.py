# coding: utf-8

from __future__ import unicode_literals
from django.template import Library

from ..admin import SuperInlineModelAdmin


register = Library()


@register.assignment_tag(takes_context=True)
def get_sub_inline_formsets(context, inline, original, index, is_template):
    if not isinstance(inline, SuperInlineModelAdmin):
        return ()
    request = context['request']
    formsets, inline_instances = inline._create_formsets(
        request, obj=original, change=original is not None, index=index,
        is_template=is_template)
    return inline.get_inline_formsets(request, formsets, inline_instances,
                                      obj=original)
