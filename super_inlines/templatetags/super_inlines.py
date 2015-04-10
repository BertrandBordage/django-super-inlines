# coding: utf-8

from __future__ import unicode_literals
from django.template import Library


register = Library()


@register.assignment_tag(takes_context=True)
def get_sub_inline_formsets(context, inline):
    request = context['request']
    formsets, inline_instances = inline._create_formsets(request, None, False)
    return inline.get_inline_formsets(request, formsets, inline_instances,
                                      obj=None)
